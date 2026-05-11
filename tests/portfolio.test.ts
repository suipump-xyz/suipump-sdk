import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PortfolioClient } from '../src/portfolio.js'

const mockCoreApi = {} as any
const mockClient = { core: mockCoreApi } as any

const defaultConfig = {
  apiKey: 'test-api-key',
  client: mockClient,
  network: 'mainnet' as const,
  apiBaseUrl: 'https://api.mainnet.suipump.xyz/v1',
  wsUrl: 'wss://stream.mainnet.suipump.xyz/v1',
}

function createClient() {
  return new PortfolioClient(mockClient, defaultConfig)
}

function mockFetch(response: any) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(''),
  })
}

function mockFetchError(status: number, message: string) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    text: () => Promise.resolve(message),
  })
}

function mockFetchNetworkError(error: Error) {
  return vi.fn().mockRejectedValue(error)
}

const sampleHolding = {
  coinType: '0xabc::coin::COIN',
  tokenName: 'Test Token',
  tokenSymbol: 'TEST',
  balance: '1000',
  valueMist: '5000000',
  pnlPct: 15.5,
  avgBuyPriceMist: '4500',
  currentPriceMist: '5000',
}

describe('PortfolioClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch({}))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('getHoldings()', () => {
    it('should fetch holdings for address', async () => {
      vi.stubGlobal('fetch', mockFetch({ holdings: [sampleHolding] }))
      const client = createClient()
      const result = await client.getHoldings('0xaddr')
      expect(result).toHaveLength(1)
      expect(result[0].tokenName).toBe('Test Token')
      expect(result[0].balance).toBe('1000')
    })

    it('should return empty holdings array', async () => {
      vi.stubGlobal('fetch', mockFetch({ holdings: [] }))
      const client = createClient()
      const result = await client.getHoldings('0xaddr')
      expect(result).toHaveLength(0)
    })

    it('should throw on API error', async () => {
      vi.stubGlobal('fetch', mockFetchError(404, 'Address not found'))
      const client = createClient()
      await expect(client.getHoldings('0xaddr')).rejects.toThrow('API error: 404 - Address not found')
    })

    it('should throw on network error', async () => {
      vi.stubGlobal('fetch', mockFetchNetworkError(new Error('Timeout')))
      const client = createClient()
      await expect(client.getHoldings('0xaddr')).rejects.toThrow('Timeout')
    })
  })

  describe('getTrades()', () => {
    const tradeRecord = {
      txHash: '0xtx',
      tokenId: 'token1',
      coinType: '0xabc::coin::COIN',
      trader: '0xtrader',
      tradeType: 'buy' as const,
      suiAmount: '1000000',
      tokenAmount: '5000',
      priceMist: '200',
      timestamp: '2026-01-01T00:00:00Z',
    }

    it('should fetch trades for address', async () => {
      vi.stubGlobal('fetch', mockFetch({ trades: [tradeRecord], nextCursor: 'next_page' }))
      const client = createClient()
      const result = await client.getTrades('0xaddr')
      expect(result.trades).toHaveLength(1)
      expect(result.nextCursor).toBe('next_page')
      expect(result.trades[0].tradeType).toBe('buy')
    })

    it('should pass filter params', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ trades: [] }),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.getTrades('0xaddr', { coinType: '0xabc::coin::COIN', limit: 10, cursor: 'cursor1' })
      const url = fetchMock.mock.calls[0][0]
      expect(url).toContain('coin_type=0xabc%3A%3Acoin%3A%3ACOIN')
      expect(url).toContain('limit=10')
      expect(url).toContain('cursor=cursor1')
    })

    it('should fetch trades without params', async () => {
      vi.stubGlobal('fetch', mockFetch({ trades: [] }))
      const client = createClient()
      const result = await client.getTrades('0xaddr')
      expect(result.trades).toHaveLength(0)
    })

    it('should throw on API error', async () => {
      vi.stubGlobal('fetch', mockFetchError(403, 'Forbidden'))
      const client = createClient()
      await expect(client.getTrades('0xaddr')).rejects.toThrow('API error: 403 - Forbidden')
    })
  })

  describe('fetch()', () => {
    it('should use POST method when body is provided', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      const result = await (client as any).fetch('/test', { key: 'value' })
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ key: 'value' }) })
      )
      expect(result).toEqual({ success: true })
    })

    it('should use GET method when body is not provided', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      const result = await (client as any).fetch('/test')
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({ method: 'GET' })
      )
      expect(result).toEqual({ success: true })
    })
  })

  describe('getPnL()', () => {
    const samplePnL = {
      holdings: [sampleHolding],
      totalValueMist: '5000000',
      totalPnlPct: 15.5,
      totalInvestedMist: '4500000',
    }

    it('should fetch PnL for address', async () => {
      vi.stubGlobal('fetch', mockFetch(samplePnL))
      const client = createClient()
      const result = await client.getPnL('0xaddr')
      expect(result.totalValueMist).toBe('5000000')
      expect(result.totalPnlPct).toBe(15.5)
      expect(result.holdings).toHaveLength(1)
    })

    it('should throw on API error', async () => {
      vi.stubGlobal('fetch', mockFetchError(500, 'Server error'))
      const client = createClient()
      await expect(client.getPnL('0xaddr')).rejects.toThrow('API error: 500 - Server error')
    })
  })
})
