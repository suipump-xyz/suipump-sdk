import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AgentClient } from '../src/agent.js'

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
  return new AgentClient(mockClient, defaultConfig)
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

describe('AgentClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch({}))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('batchBuy()', () => {
    const sampleBatchResult = { ptbBytes: 'batch_ptb', estimatedGasSui: '0.005', expectedOut: '15000', priceImpactPct: 0.3 }

    it('should send batch buy with multiple buys', async () => {
      vi.stubGlobal('fetch', mockFetch(sampleBatchResult))
      const client = createClient()
      const result = await client.batchBuy({
        buys: [
          { coinType: '0xabc::coin::COIN', suiAmountMist: '1000000', minTokensOut: '900000' },
          { coinType: '0xdef::coin::TOKEN', suiAmountMist: '2000000', minTokensOut: '1800000', slippageBps: 100 },
        ],
        buyerAddress: '0xbuyer',
      })
      expect(result.ptbBytes).toBe('batch_ptb')
    })

    it('should format buys with camelCase and minTokensOut', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleBatchResult),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.batchBuy({
        buys: [
          { coinType: '0xabc::coin::COIN', suiAmountMist: '1000000', minTokensOut: '900000' },
        ],
        buyerAddress: '0xbuyer',
      })
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.buys).toHaveLength(1)
      expect(body.buys[0].coinType).toBe('0xabc::coin::COIN')
      expect(body.buys[0].suiAmountMist).toBe('1000000')
      expect(body.buys[0].minTokensOut).toBe('900000')
      expect(body.buys[0].slippageBps).toBe(50)
      expect(body.buyerAddress).toBe('0xbuyer')
    })

    it('should use custom slippage per buy', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleBatchResult),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.batchBuy({
        buys: [
          { coinType: '0xabc::coin::COIN', suiAmountMist: '1000000', minTokensOut: '900000', slippageBps: 200 },
        ],
        buyerAddress: '0xbuyer',
      })
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.buys[0].slippageBps).toBe(200)
    })

    it('should handle empty buys array', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleBatchResult),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.batchBuy({ buys: [], buyerAddress: '0xbuyer' })
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.buys).toHaveLength(0)
    })

    it('should throw on API error', async () => {
      vi.stubGlobal('fetch', mockFetchError(400, 'Invalid buys'))
      const client = createClient()
      await expect(client.batchBuy({ buys: [], buyerAddress: '0xbuyer' })).rejects.toThrow('API error: 400 - Invalid buys')
    })
  })

  describe('copySubscribe()', () => {
    const sampleSubscription = {
      subscriptionId: 'sub_123',
      targetTrader: '0xtarget',
      subscriber: '0xsub',
      maxSuiPerTrade: '1000000000',
      ratio: 100,
      status: 'active',
      message: 'Copy trading subscribed.',
    }

    it('should subscribe with all params', async () => {
      vi.stubGlobal('fetch', mockFetch(sampleSubscription))
      const client = createClient()
      const result = await client.copySubscribe({
        targetTrader: '0xtarget',
        subscriber: '0xsub',
        maxSuiPerTrade: '5000000000',
        ratio: 50,
      })
      expect(result.subscriptionId).toBe('sub_123')
      expect(result.status).toBe('active')
    })

    it('should use defaults for optional params', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleSubscription),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.copySubscribe({
        targetTrader: '0xtarget',
        subscriber: '0xsub',
      })
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.maxSuiPerTrade).toBe('1000000000')
      expect(body.ratio).toBe(100)
    })

    it('should send correct request body with subscriber/targetTrader', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleSubscription),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.copySubscribe({
        targetTrader: '0xtarget',
        subscriber: '0xsub',
        maxSuiPerTrade: '2000000000',
        ratio: 25,
      })
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.subscriber).toBe('0xsub')
      expect(body.targetTrader).toBe('0xtarget')
      expect(body.maxSuiPerTrade).toBe('2000000000')
      expect(body.ratio).toBe(25)
    })

    it('should throw on API error', async () => {
      vi.stubGlobal('fetch', mockFetchError(409, 'Already subscribed'))
      const client = createClient()
      await expect(client.copySubscribe({ targetTrader: '0xtarget', subscriber: '0xsub' })).rejects.toThrow('API error: 409 - Already subscribed')
    })
  })

  describe('unsubscribe()', () => {
    const sampleUnsubscribe = {
      subscriptionId: 'sub_123',
      status: 'cancelled',
      message: 'Copy trading subscription cancelled.',
    }

    it('should unsubscribe with success', async () => {
      vi.stubGlobal('fetch', mockFetch(sampleUnsubscribe))
      const client = createClient()
      const result = await client.unsubscribe('sub_123')
      expect(result.status).toBe('cancelled')
    })

    it('should send POST to /agent/copy-unsubscribe with subscriptionId in body', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleUnsubscribe),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.unsubscribe('sub_123')
      expect(fetchMock.mock.calls[0][1].method).toBe('POST')
      expect(fetchMock.mock.calls[0][0]).toContain('/agent/copy-unsubscribe')
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.subscriptionId).toBe('sub_123')
    })

    it('should throw on API error', async () => {
      vi.stubGlobal('fetch', mockFetchError(404, 'Subscription not found'))
      const client = createClient()
      await expect(client.unsubscribe('sub_999')).rejects.toThrow('API error: 404 - Subscription not found')
    })

    it('should throw on network error', async () => {
      vi.stubGlobal('fetch', mockFetchNetworkError(new Error('Connection refused')))
      const client = createClient()
      await expect(client.unsubscribe('sub_123')).rejects.toThrow('Connection refused')
    })
  })
})
