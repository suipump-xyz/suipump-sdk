import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TokensClient } from '../src/tokens.js'

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
  return new TokensClient(mockClient, defaultConfig)
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

describe('TokensClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch({}))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('get()', () => {
    it('should fetch token metadata by coinType', async () => {
      vi.stubGlobal('fetch', mockFetch(sampleToken))
      const client = createClient()
      const result = await client.get('0xabc::coin::COIN')
      expect(result.coinType).toBe('0xabc::coin::COIN')
      expect(result.name).toBe('Test Token')
      expect(result.symbol).toBe('TEST')
    })

    it('should encode special characters in coinType', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleToken),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.get('0xabc::coin::COIN')
      const url = fetchMock.mock.calls[0][0]
      expect(url).toContain('/tokens/0xabc%3A%3Acoin%3A%3ACOIN')
    })

    it('should throw on API error', async () => {
      vi.stubGlobal('fetch', mockFetchError(404, 'Token not found'))
      const client = createClient()
      await expect(client.get('0xabc::coin::COIN')).rejects.toThrow('API error: 404 - Token not found')
    })

    it('should throw on network error', async () => {
      vi.stubGlobal('fetch', mockFetchNetworkError(new Error('Network failure')))
      const client = createClient()
      await expect(client.get('0xabc::coin::COIN')).rejects.toThrow('Network failure')
    })

    it('should handle server error', async () => {
      vi.stubGlobal('fetch', mockFetchError(500, 'Internal Server Error'))
      const client = createClient()
      await expect(client.get('0xabc::coin::COIN')).rejects.toThrow('API error: 500 - Internal Server Error')
    })
  })

  describe('list()', () => {
    const sampleList = {
      tokens: [sampleToken],
      nextCursor: 'cursor_abc',
    }

    it('should fetch token list without params', async () => {
      vi.stubGlobal('fetch', mockFetch(sampleList))
      const client = createClient()
      const result = await client.list()
      expect(result.tokens).toHaveLength(1)
      expect(result.nextCursor).toBe('cursor_abc')
    })

    it('should pass sort parameter', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ tokens: [] }),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.list({ sort: 'volume' })
      expect(fetchMock.mock.calls[0][0]).toContain('sort=volume')
    })

    it('should pass limit parameter', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ tokens: [] }),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.list({ limit: 20 })
      expect(fetchMock.mock.calls[0][0]).toContain('limit=20')
    })

    it('should pass cursor parameter', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ tokens: [] }),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.list({ cursor: 'abc123' })
      expect(fetchMock.mock.calls[0][0]).toContain('cursor=abc123')
    })

    it('should pass graduated parameter when false', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ tokens: [] }),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.list({ graduated: false })
      expect(fetchMock.mock.calls[0][0]).toContain('graduated=false')
    })

    it('should pass graduated parameter when true', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ tokens: [] }),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.list({ graduated: true })
      expect(fetchMock.mock.calls[0][0]).toContain('graduated=true')
    })

    it('should combine multiple parameters', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ tokens: [] }),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.list({ sort: 'created', limit: 10, cursor: 'xyz', graduated: false })
      const url = fetchMock.mock.calls[0][0]
      expect(url).toContain('sort=created')
      expect(url).toContain('limit=10')
      expect(url).toContain('cursor=xyz')
      expect(url).toContain('graduated=false')
    })

    it('should return empty list', async () => {
      vi.stubGlobal('fetch', mockFetch({ tokens: [] }))
      const client = createClient()
      const result = await client.list()
      expect(result.tokens).toHaveLength(0)
      expect(result.nextCursor).toBeUndefined()
    })

    it('should throw on API error', async () => {
      vi.stubGlobal('fetch', mockFetchError(400, 'Bad request'))
      const client = createClient()
      await expect(client.list()).rejects.toThrow('API error: 400 - Bad request')
    })
  })

  describe('buy()', () => {
    const sampleBuyResult = { ptbBytes: 'base64bytes', estimatedGasSui: '0.001', expectedOut: '5000', priceImpactPct: 0.1 }

    it('should buy with required params only', async () => {
      vi.stubGlobal('fetch', mockFetch(sampleBuyResult))
      const client = createClient()
      const result = await client.buy({ coinType: '0xabc::coin::COIN', suiAmountMist: '1000000', buyerAddress: '0xaddr' })
      expect(result.ptbBytes).toBe('base64bytes')
      expect(result.estimatedGasSui).toBe('0.001')
    })

    it('should send correct request body', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleBuyResult),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.buy({ coinType: '0xabc::coin::COIN', suiAmountMist: '5000000', buyerAddress: '0xaddr' })
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.coin_type).toBe('0xabc::coin::COIN')
      expect(body.sui_amount_mist).toBe('5000000')
      expect(body.buyer_address).toBe('0xaddr')
      expect(body.slippage_bps).toBe(50)
    })

    it('should use custom slippage', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleBuyResult),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.buy({ coinType: '0xabc::coin::COIN', suiAmountMist: '1000000', buyerAddress: '0xaddr', slippageBps: 100 })
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.slippage_bps).toBe(100)
    })

    it('should pass minTokensOut when provided', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleBuyResult),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.buy({ coinType: '0xabc::coin::COIN', suiAmountMist: '1000000', buyerAddress: '0xaddr', minTokensOut: '4000' })
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.min_tokens_out).toBe('4000')
    })

    it('should throw on API error', async () => {
      vi.stubGlobal('fetch', mockFetchError(403, 'Forbidden'))
      const client = createClient()
      await expect(client.buy({ coinType: '0xabc::coin::COIN', suiAmountMist: '1000000', buyerAddress: '0xaddr' })).rejects.toThrow('API error: 403 - Forbidden')
    })
  })

  describe('sell()', () => {
    const sampleSellResult = { ptbBytes: 'base64sell', estimatedGasSui: '0.002', expectedOut: '2000', priceImpactPct: 0.2 }

    it('should sell with required params only', async () => {
      vi.stubGlobal('fetch', mockFetch(sampleSellResult))
      const client = createClient()
      const result = await client.sell({ coinType: '0xabc::coin::COIN', tokenAmount: '5000', sellerAddress: '0xseller' })
      expect(result.ptbBytes).toBe('base64sell')
    })

    it('should send correct request body', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleSellResult),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.sell({ coinType: '0xabc::coin::COIN', tokenAmount: '5000', sellerAddress: '0xseller' })
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.coin_type).toBe('0xabc::coin::COIN')
      expect(body.token_amount).toBe('5000')
      expect(body.seller_address).toBe('0xseller')
      expect(body.slippage_bps).toBe(50)
    })

    it('should use custom slippage and minSuiOut', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleSellResult),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.sell({ coinType: '0xabc::coin::COIN', tokenAmount: '5000', sellerAddress: '0xseller', slippageBps: 200, minSuiOutMist: '1500' })
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.slippage_bps).toBe(200)
      expect(body.min_sui_out_mist).toBe('1500')
    })

    it('should throw on API error', async () => {
      vi.stubGlobal('fetch', mockFetchError(429, 'Rate limited'))
      const client = createClient()
      await expect(client.sell({ coinType: '0xabc::coin::COIN', tokenAmount: '5000', sellerAddress: '0xseller' })).rejects.toThrow('API error: 429 - Rate limited')
    })
  })

  describe('create()', () => {
    const sampleCreateResult = {
      ptb: { ptbBytes: 'create_ptb', estimatedGasSui: '0.01', expectedOut: '0', priceImpactPct: 0 },
      tokenMetadata: sampleToken,
    }

    it('should create with required params only', async () => {
      vi.stubGlobal('fetch', mockFetch(sampleCreateResult))
      const client = createClient()
      const result = await client.create({ name: 'New Token', symbol: 'NEW' })
      expect(result.ptb.ptbBytes).toBe('create_ptb')
      expect(result.tokenMetadata.name).toBe('Test Token')
    })

    it('should send all optional fields', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleCreateResult),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.create({
        name: 'Full Token',
        symbol: 'FULL',
        description: 'A fully described token',
        iconBlobId: 'blob123',
        twitter: '@token',
        telegram: 't.me/token',
        website: 'https://token.xyz',
      })
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.name).toBe('Full Token')
      expect(body.symbol).toBe('FULL')
      expect(body.description).toBe('A fully described token')
      expect(body.icon_blob_id).toBe('blob123')
      expect(body.twitter).toBe('@token')
      expect(body.telegram).toBe('t.me/token')
      expect(body.website).toBe('https://token.xyz')
    })

    it('should default description to empty string', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleCreateResult),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.create({ name: 'No Desc', symbol: 'ND' })
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.description).toBe('')
    })

    it('should throw on API error', async () => {
      vi.stubGlobal('fetch', mockFetchError(409, 'Token already exists'))
      const client = createClient()
      await expect(client.create({ name: 'Dup', symbol: 'DUP' })).rejects.toThrow('API error: 409 - Token already exists')
    })
  })
})
