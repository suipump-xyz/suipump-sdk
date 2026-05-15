import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SuiPump } from '../src/index.js'
import type {
  PTBResult, SuiAddress, CoinType, MistAmount, TokenMetadata, TradeRecord,
  BuyParams, SellParams, CreateTokenParams, ListTokensParams,
  BatchBuyParams, CopySubscribeParams,
  PortfolioHolding, PortfolioOverview,
  StreamEvent, NewTokenEvent, TradeEvent, GraduationEvent,
} from '../src/index.js'

const mockCoreApi = {} as any
const mockClient = { core: mockCoreApi } as any

describe('README examples compile and type-check', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // --- Quick Start ---
  it('README quick start: creates SuiPump instance', () => {
    const client = mockClient
    const pump = new SuiPump({
      apiKey: 'test-api-key',
      client,
      network: 'mainnet',
    })
    expect(pump).toBeInstanceOf(SuiPump)
    expect(pump.config.apiKey).toBe('test-api-key')
    expect(pump.config.network).toBe('mainnet')
  })

  // --- Tokens ---
  it('README tokens: types compile correctly', () => {
    const params: BuyParams = {
      coinType: '0xabc::coin::TOKEN',
      suiAmountMist: '1000000000',
      buyerAddress: '0xdef',
      slippageBps: 50,
    }
    expect(params.suiAmountMist).toBe('1000000000')
  })

  it('README tokens: sell params compile', () => {
    const params: SellParams = {
      coinType: '0xabc::coin::TOKEN',
      tokenAmount: '1000000',
      sellerAddress: '0x seller',
      slippageBps: 50,
    }
    expect(params.tokenAmount).toBe('1000000')
  })

  it('README tokens: create params compile', () => {
    const params: CreateTokenParams = {
      name: 'My Token',
      symbol: 'MTK',
      description: 'My awesome token',
      creatorAddress: '0xcreator',
      imageBlobId: 'walrus-blob-id',
    }
    expect(params.name).toBe('My Token')
    expect(params.symbol).toBe('MTK')
  })

  it('README tokens: list params compile', () => {
    const params: ListTokensParams = {
      sort: 'volume',
      limit: 20,
    }
    expect(params.limit).toBe(20)
  })

  // --- Portfolio ---
  it('README portfolio: holding type compiles', () => {
    const holding: PortfolioHolding = {
      token: {
        coinType: '0xabc::coin::TOKEN',
        curveObjectId: '0x123',
        name: 'Test',
        symbol: 'TST',
        description: '',
        creatorAddress: '0xcreator',
        realSuiReserves: '1000',
        realTokenReserves: '500000',
        currentPriceMist: '5000',
        marketCapSui: '50000',
        totalVolumeSui: '100000',
        totalTrades: 10,
        holderCount: 5,
        curveProgress: 50,
        graduated: false,
        createdAt: '2026-01-01T00:00:00Z',
      },
      balance: '1000',
      valueSui: '5000000',
    }
    expect(holding.balance).toBe('1000')
  })

  it('README portfolio: overview type compiles', () => {
    const summary: PortfolioOverview = {
      address: '0xaddr',
      suiBalance: '1000000000',
      portfolioValueSui: '5000000',
      holdingsCount: 5,
      tradesTodayCount: 3,
      totalTrades: 42,
    }
    expect(summary.holdingsCount).toBe(5)
  })

  // --- Agent ---
  it('README agent: batch buy params compile', () => {
    const params: BatchBuyParams = {
      buys: [
        { coinType: '0xabc', suiAmountMist: '1000000000' },
        { coinType: '0xdef', suiAmountMist: '500000000' },
      ],
      buyerAddress: '0xaddr',
    }
    expect(params.buys).toHaveLength(2)
  })

  it('README agent: copy subscribe params compile', () => {
    const params: CopySubscribeParams = {
      targetTrader: '0xwhale',
      subscriber: '0xme',
      maxSuiPerTrade: '1000000000',
      ratio: 0.1,
    }
    expect(params.ratio).toBe(0.1)
  })

  // --- Stream ---
  it('README stream: event types compile', () => {
    const newToken: NewTokenEvent = {
      event: 'new_token',
      data: { coinType: 'c', name: 'n', symbol: 's', creator: 'c', graduated: false, curveProgress: 0 },
      ts: Date.now(),
    }
    const trade: TradeEvent = {
      event: 'trade',
      data: { coinType: 'c', tradeType: 'buy', suiAmount: '1', tokenAmount: '1', trader: 't', priceMist: '1', curveProgress: 0 },
      ts: Date.now(),
    }
    const grad: GraduationEvent = {
      event: 'graduated',
      data: { coinType: 'c' },
      ts: Date.now(),
    }
    expect(newToken.event).toBe('new_token')
    expect(trade.event).toBe('trade')
    expect(grad.event).toBe('graduated')
  })

  // --- Types ---
  it('README types: PTBResult compiles with all fields', () => {
    const ptb: PTBResult = {
      ptbBytes: 'base64-encoded-bytes',
      estimatedGasSui: '0.001',
      expectedOut: '1000000',
      priceImpactPct: 0.5,
    }
    expect(ptb.ptbBytes).toBeDefined()
    expect(ptb.estimatedGasSui).toBeDefined()
    expect(ptb.expectedOut).toBeDefined()
    expect(ptb.priceImpactPct).toBe(0.5)
  })

  it('README types: branded type aliases compile', () => {
    const addr: SuiAddress = '0x123'
    const ct: CoinType = '0xabc::coin::TOKEN'
    const mist: MistAmount = '1000000000'
    expect(typeof addr).toBe('string')
    expect(typeof ct).toBe('string')
    expect(typeof mist).toBe('string')
  })

  it('README types: TokenMetadata compiles', () => {
    const meta: TokenMetadata = {
      coinType: '0xabc::coin::TOKEN',
      curveObjectId: '0x123',
      name: 'Test',
      symbol: 'TST',
      description: '',
      creatorAddress: '0xcreator',
      realSuiReserves: '1000',
      realTokenReserves: '500000',
      currentPriceMist: '2',
      marketCapSui: '50000',
      totalVolumeSui: '100000',
      totalTrades: 10,
      holderCount: 5,
      curveProgress: 50,
      graduated: false,
      createdAt: '2026-01-01T00:00:00Z',
    }
    expect(meta.name).toBe('Test')
  })

  it('README types: TradeRecord compiles', () => {
    const trade: TradeRecord = {
      txHash: '0xtx',
      tokenId: 't1',
      coinType: '0x1::coin::COIN',
      trader: '0xtrader',
      tradeType: 'buy',
      suiAmount: '1000',
      tokenAmount: '500',
      priceMist: '2',
      timestamp: '2026-01-01T00:00:00Z',
    }
    expect(trade.tradeType).toBe('buy')
  })

  // --- Networks ---
  it('README networks: supports all three networks', () => {
    const pumpMainnet = new SuiPump({ apiKey: 'k', client: mockClient, network: 'mainnet' })
    const pumpTestnet = new SuiPump({ apiKey: 'k', client: mockClient, network: 'testnet' })
    const pumpDevnet = new SuiPump({ apiKey: 'k', client: mockClient, network: 'devnet' })
    expect(pumpMainnet.config.network).toBe('mainnet')
    expect(pumpTestnet.config.network).toBe('testnet')
    expect(pumpDevnet.config.network).toBe('devnet')
  })
})
