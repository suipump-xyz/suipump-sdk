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

const sampleToken = {
  coinType: '0xabc::coin::COIN',
  curveObjectId: '0x123',
  name: 'Test Token',
  symbol: 'TEST',
  description: 'A test token',
  creatorAddress: '0xcreator',
  realSuiReserves: '1000000000',
  realTokenReserves: '1000000000000000',
  currentPriceMist: '1000',
  marketCapSui: '50000',
  totalVolumeSui: '100000',
  totalTrades: 42,
  holderCount: 10,
  curveProgress: 50,
  graduated: false,
  createdAt: '2026-01-01T00:00:00Z',
}

const sampleHolding = {
  token: sampleToken,
  balance: '1000',
  valueSui: '5000000',
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
      vi.stubGlobal('fetch', mockFetch({ address: '0xaddr', holdings: [sampleHolding] }))
      const client = createClient()
      const result = await client.getHoldings('0xaddr')
      expect(result.holdings).toHaveLength(1)
      expect(result.holdings[0].token.name).toBe('Test Token')
      expect(result.holdings[0].balance).toBe('1000')
      expect(result.holdings[0].valueSui).toBe('5000000')
    })

    it('should return empty holdings array', async () => {
      vi.stubGlobal('fetch', mockFetch({ address: '0xaddr', holdings: [] }))
      const client = createClient()
      const result = await client.getHoldings('0xaddr')
      expect(result.holdings).toHaveLength(0)
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
      vi.stubGlobal('fetch', mockFetch({ address: '0xaddr', trades: [tradeRecord], limit: 50 }))
      const client = createClient()
      const result = await client.getTrades('0xaddr')
      expect(result.trades).toHaveLength(1)
      expect(result.trades[0].tradeType).toBe('buy')
      expect(result.address).toBe('0xaddr')
    })

    it('should pass limit param', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ address: '0xaddr', trades: [], limit: 10 }),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.getTrades('0xaddr', { limit: 10 })
      expect(fetchMock.mock.calls[0][0]).toContain('limit=10')
    })

    it('should fetch trades without params', async () => {
      vi.stubGlobal('fetch', mockFetch({ address: '0xaddr', trades: [], limit: 50 }))
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

  describe('getOverview()', () => {
    const sampleOverview = {
      address: '0xaddr',
      suiBalance: '1000000000',
      portfolioValueSui: '5000000',
      holdingsCount: 5,
      tradesTodayCount: 3,
      totalTrades: 42,
    }

    it('should fetch overview for address', async () => {
      vi.stubGlobal('fetch', mockFetch(sampleOverview))
      const client = createClient()
      const result = await client.getOverview('0xaddr')
      expect(result.suiBalance).toBe('1000000000')
      expect(result.portfolioValueSui).toBe('5000000')
      expect(result.holdingsCount).toBe(5)
      expect(result.totalTrades).toBe(42)
    })

    it('should throw on API error', async () => {
      vi.stubGlobal('fetch', mockFetchError(500, 'Server error'))
      const client = createClient()
      await expect(client.getOverview('0xaddr')).rejects.toThrow('API error: 500 - Server error')
    })
  })
})
