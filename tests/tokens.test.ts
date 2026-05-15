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
    it('should unwrap token from response', async () => {
      vi.stubGlobal('fetch', mockFetch({ token: sampleToken }))
      const client = createClient()
      const result = await client.get('0xabc::coin::COIN')
      expect(result.coinType).toBe('0xabc::coin::COIN')
      expect(result.name).toBe('Test Token')
      expect(result.symbol).toBe('TEST')
    })

    it('should encode special characters in coinType', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token: sampleToken }),
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
      limit: 50,
      offset: 0,
    }

    it('should fetch token list without params', async () => {
      vi.stubGlobal('fetch', mockFetch(sampleList))
      const client = createClient()
      const result = await client.list()
      expect(result.tokens).toHaveLength(1)
      expect(result.limit).toBe(50)
      expect(result.offset).toBe(0)
    })

    it('should pass sort parameter', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ tokens: [], limit: 50, offset: 0 }),
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
        json: () => Promise.resolve({ tokens: [], limit: 20, offset: 0 }),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.list({ limit: 20 })
      expect(fetchMock.mock.calls[0][0]).toContain('limit=20')
    })

    it('should pass offset parameter', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ tokens: [], limit: 50, offset: 10 }),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.list({ offset: 10 })
      expect(fetchMock.mock.calls[0][0]).toContain('offset=10')
    })

    it('should call /tokens/graduated when graduated is true', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ tokens: [], limit: 20, offset: 0 }),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.list({ graduated: true, limit: 20 })
      expect(fetchMock.mock.calls[0][0]).toContain('/tokens/graduated')
    })

    it('should combine multiple parameters', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ tokens: [], limit: 10, offset: 5 }),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.list({ sort: 'created', limit: 10, offset: 5 })
      const url = fetchMock.mock.calls[0][0]
      expect(url).toContain('sort=created')
      expect(url).toContain('limit=10')
      expect(url).toContain('offset=5')
    })

    it('should return empty list', async () => {
      vi.stubGlobal('fetch', mockFetch({ tokens: [], limit: 50, offset: 0 }))
      const client = createClient()
      const result = await client.list()
      expect(result.tokens).toHaveLength(0)
    })

    it('should throw on API error', async () => {
      vi.stubGlobal('fetch', mockFetchError(400, 'Bad request'))
      const client = createClient()
      await expect(client.list()).rejects.toThrow('API error: 400 - Bad request')
    })
  })

  describe('buy()', () => {
    const sampleBuyResult = { ptbBytes: 'base64bytes', estimatedGasSui: '0.001', expectedOut: '5000', priceImpactPct: 0.1 }

    it('should buy with all required params including minTokensOut', async () => {
      vi.stubGlobal('fetch', mockFetch(sampleBuyResult))
      const client = createClient()
      const result = await client.buy({ coinType: '0xabc::coin::COIN', suiAmountMist: '1000000', minTokensOut: '900000', buyerAddress: '0xaddr' })
      expect(result.ptbBytes).toBe('base64bytes')
      expect(result.estimatedGasSui).toBe('0.001')
    })

    it('should send required minTokensOut in request body', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleBuyResult),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.buy({ coinType: '0xabc::coin::COIN', suiAmountMist: '5000000', minTokensOut: '4500000', buyerAddress: '0xaddr' })
      const url = fetchMock.mock.calls[0][0]
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(url).toContain('/trading/0xabc%3A%3Acoin%3A%3ACOIN/buy')
      expect(body.suiAmountMist).toBe('5000000')
      expect(body.minTokensOut).toBe('4500000')
      expect(body.buyerAddress).toBe('0xaddr')
      expect(body.slippageBps).toBe(50)
    })

    it('should use custom slippage', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleBuyResult),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.buy({ coinType: '0xabc::coin::COIN', suiAmountMist: '1000000', minTokensOut: '900000', buyerAddress: '0xaddr', slippageBps: 100 })
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.slippageBps).toBe(100)
    })

    it('should throw on API error', async () => {
      vi.stubGlobal('fetch', mockFetchError(403, 'Forbidden'))
      const client = createClient()
      await expect(client.buy({ coinType: '0xabc::coin::COIN', suiAmountMist: '1000000', minTokensOut: '900000', buyerAddress: '0xaddr' })).rejects.toThrow('API error: 403 - Forbidden')
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

    it('should send correct request body and URL', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleSellResult),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.sell({ coinType: '0xabc::coin::COIN', tokenAmount: '5000', sellerAddress: '0xseller' })
      const url = fetchMock.mock.calls[0][0]
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(url).toContain('/trading/0xabc%3A%3Acoin%3A%3ACOIN/sell')
      expect(body.tokenAmount).toBe('5000')
      expect(body.sellerAddress).toBe('0xseller')
      expect(body.slippageBps).toBe(50)
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
      expect(body.slippageBps).toBe(200)
      expect(body.minSuiOutMist).toBe('1500')
    })

    it('should throw on API error', async () => {
      vi.stubGlobal('fetch', mockFetchError(429, 'Rate limited'))
      const client = createClient()
      await expect(client.sell({ coinType: '0xabc::coin::COIN', tokenAmount: '5000', sellerAddress: '0xseller' })).rejects.toThrow('API error: 429 - Rate limited')
    })
  })

  describe('getCreationInfo()', () => {
    const sampleInfo = {
      creationFeeSui: '0.5',
      creationFeeMist: '500000000',
      endpoints: { preparePublish: 'POST /api/tokens/prepare-publish', confirmCreate: 'POST /api/tokens/confirm-create' },
      note: 'Use a two-step process...',
    }

    it('should fetch creation info', async () => {
      vi.stubGlobal('fetch', mockFetch(sampleInfo))
      const client = createClient()
      const result = await client.getCreationInfo()
      expect(result.creationFeeSui).toBe('0.5')
      expect(result.creationFeeMist).toBe('500000000')
      expect(result.endpoints.preparePublish).toBeDefined()
    })
  })

  describe('preparePublish()', () => {
    const samplePrepare = {
      publishTxBytes: '0xabc',
      metadataBlobId: 'blob123',
      creationFeeMist: '500000000',
      estimatedGasSui: '0.01',
      steps: ['Step 1', 'Step 2'],
      otwModuleName: 'my_token_MODULE',
      otwName: 'MY_TOKEN',
    }

    it('should prepare publish with required params', async () => {
      vi.stubGlobal('fetch', mockFetch(samplePrepare))
      const client = createClient()
      const result = await client.preparePublish({ name: 'My Token', symbol: 'MTK', creatorAddress: '0xcreator' })
      expect(result.publishTxBytes).toBe('0xabc')
      expect(result.otwModuleName).toBe('my_token_MODULE')
    })

    it('should send optional fields', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(samplePrepare),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.preparePublish({ name: 'My Token', symbol: 'MTK', description: 'desc', creatorAddress: '0xcreator', imageBlobId: 'blob123' })
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.name).toBe('My Token')
      expect(body.symbol).toBe('MTK')
      expect(body.description).toBe('desc')
      expect(body.creatorAddress).toBe('0xcreator')
      expect(body.imageBlobId).toBe('blob123')
    })
  })

  describe('confirmCreate()', () => {
    const sampleConfirm = {
      token: sampleToken,
      creationTxHash: '0xconfirm_tx',
    }

    it('should confirm creation and return token', async () => {
      vi.stubGlobal('fetch', mockFetch(sampleConfirm))
      const client = createClient()
      const result = await client.confirmCreate({
        name: 'My Token',
        symbol: 'MTK',
        creatorAddress: '0xcreator',
        publishedPackageId: '0xpkg',
        treasuryCapObjectId: '0xtcap',
        coinMetadataObjectId: '0xmet',
      })
      expect(result.token.name).toBe('Test Token')
      expect(result.creationTxHash).toBe('0xconfirm_tx')
    })

    it('should send all fields to backend', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleConfirm),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.confirmCreate({
        name: 'My Token',
        symbol: 'MTK',
        description: 'desc',
        creatorAddress: '0xcreator',
        publishedPackageId: '0xpkg',
        treasuryCapObjectId: '0xtcap',
        coinMetadataObjectId: '0xmet',
        imageBlobId: 'blob123',
      })
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.name).toBe('My Token')
      expect(body.publishedPackageId).toBe('0xpkg')
      expect(body.treasuryCapObjectId).toBe('0xtcap')
      expect(body.coinMetadataObjectId).toBe('0xmet')
    })
  })

  describe('create()', () => {
    const sampleCreateResult = {
      creationFeeSui: '0.5',
      creationFeeMist: '500000000',
      endpoints: { preparePublish: 'POST /api/tokens/prepare-publish', confirmCreate: 'POST /api/tokens/confirm-create' },
      note: 'Use a two-step process...',
    }

    it('should return creation fee info', async () => {
      vi.stubGlobal('fetch', mockFetch(sampleCreateResult))
      const client = createClient()
      const result = await client.create({ name: 'New Token', symbol: 'NEW', creatorAddress: '0xcreator' })
      expect(result.creationFeeSui).toBe('0.5')
      expect(result.endpoints.preparePublish).toBeDefined()
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
        creatorAddress: '0xcreator',
        imageBlobId: 'blob123',
        twitter: '@token',
        telegram: 't.me/token',
        website: 'https://token.xyz',
      })
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.name).toBe('Full Token')
      expect(body.symbol).toBe('FULL')
      expect(body.description).toBe('A fully described token')
      expect(body.creatorAddress).toBe('0xcreator')
      expect(body.imageBlobId).toBe('blob123')
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
      await client.create({ name: 'No Desc', symbol: 'ND', creatorAddress: '0xcreator' })
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.description).toBe('')
    })

    it('should throw on API error', async () => {
      vi.stubGlobal('fetch', mockFetchError(409, 'Token already exists'))
      const client = createClient()
      await expect(client.create({ name: 'Dup', symbol: 'DUP', creatorAddress: '0xcreator' })).rejects.toThrow('API error: 409 - Token already exists')
    })
  })
})
