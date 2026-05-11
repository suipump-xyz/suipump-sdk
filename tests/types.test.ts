import { describe, it, expect } from 'vitest'
import type {
  PTBResult,
  SuiAddress,
  CoinType,
  MistAmount,
  TokenMetadata,
  TradeRecord,
} from '../src/types.js'
import type { SuiPumpConfig } from '../src/client.js'
import type {
  BuyParams,
  SellParams,
  CreateTokenParams,
  ListTokensParams,
} from '../src/tokens.js'
import type {
  BatchBuyParams,
  CopySubscribeParams,
} from '../src/agent.js'
import type {
  PortfolioHolding,
  PortfolioSummary,
} from '../src/portfolio.js'
import type {
  StreamEvent,
  NewTokenEvent,
  TradeEvent,
  GraduationEvent,
} from '../src/stream.js'

describe('Type exports', () => {
  it('PTBResult type can be constructed', () => {
    const ptb: PTBResult = {
      ptbBytes: 'base64',
      estimatedGasSui: '0.001',
      expectedOut: '1000',
      priceImpactPct: 0.5,
    }
    expect(ptb.ptbBytes).toBe('base64')
    expect(typeof ptb.priceImpactPct).toBe('number')
  })

  it('SuiAddress is a string', () => {
    const addr: SuiAddress = '0x1234567890abcdef'
    expect(typeof addr).toBe('string')
    expect(addr).toMatch(/^0x/)
  })

  it('CoinType is a string', () => {
    const coin: CoinType = '0xabc::coin::COIN'
    expect(typeof coin).toBe('string')
  })

  it('MistAmount is a string', () => {
    const amount: MistAmount = '1000000000'
    expect(typeof amount).toBe('string')
  })

  it('TokenMetadata can be constructed with required fields', () => {
    const meta: TokenMetadata = {
      coinType: '0xabc::coin::COIN',
      curveObjectId: '0x123',
      name: 'Test',
      symbol: 'TST',
      description: 'desc',
      creatorAddress: '0xcreator',
      realSuiReserves: '1000',
      realTokenReserves: '500000',
      currentPriceMist: '2',
      marketCapSui: '50000',
      totalVolumeSui: '100000',
      totalTrades: 42,
      holderCount: 10,
      curveProgress: 50,
      graduated: false,
      createdAt: '2026-01-01T00:00:00Z',
    }
    expect(meta.graduated).toBe(false)
    expect(meta.totalTrades).toBe(42)
  })

  it('TokenMetadata with optional fields', () => {
    const meta: TokenMetadata = {
      coinType: '0xabc::coin::COIN',
      curveObjectId: '0x123',
      name: 'Test',
      symbol: 'TST',
      description: 'desc',
      creatorAddress: '0xcreator',
      creatorSuiName: 'test.sui',
      walrusBlobId: 'blob123',
      twitter: '@test',
      telegram: 't.me/test',
      website: 'https://test.xyz',
      realSuiReserves: '1000',
      realTokenReserves: '500000',
      currentPriceMist: '2',
      marketCapSui: '50000',
      totalVolumeSui: '100000',
      totalTrades: 42,
      holderCount: 10,
      curveProgress: 50,
      graduated: true,
      cetusPoolId: '0xcetus',
      deepbookPoolId: '0xdeepbook',
      createdAt: '2026-01-01T00:00:00Z',
      graduatedAt: '2026-02-01T00:00:00Z',
    }
    expect(meta.graduated).toBe(true)
    expect(meta.creatorSuiName).toBe('test.sui')
  })

  it('TradeRecord can be constructed', () => {
    const trade: TradeRecord = {
      txHash: '0xtx',
      tokenId: 'token1',
      coinType: '0xabc::coin::COIN',
      trader: '0xtrader',
      tradeType: 'buy',
      suiAmount: '1000000',
      tokenAmount: '5000',
      priceMist: '200',
      timestamp: '2026-01-01T00:00:00Z',
    }
    expect(trade.tradeType).toBe('buy')
  })

  it('SuiPumpConfig with required fields only', () => {
    const config: SuiPumpConfig = {
      apiKey: 'key',
      client: {} as any,
    }
    expect(config.apiKey).toBe('key')
  })

  it('SuiPumpConfig with all fields', () => {
    const config: SuiPumpConfig = {
      apiKey: 'key',
      client: {} as any,
      network: 'testnet',
      apiBaseUrl: 'https://api.test.suipump.xyz',
      wsUrl: 'wss://stream.test.suipump.xyz',
    }
    expect(config.network).toBe('testnet')
  })

  it('BuyParams with optional slippage', () => {
    const params: BuyParams = {
      coinType: '0xabc::coin::COIN',
      suiAmountMist: '1000000',
      buyerAddress: '0xaddr',
    }
    expect(params.slippageBps).toBeUndefined()
  })

  it('BuyParams with all fields', () => {
    const params: BuyParams = {
      coinType: '0xabc::coin::COIN',
      suiAmountMist: '1000000',
      minTokensOut: '5000',
      buyerAddress: '0xaddr',
      slippageBps: 100,
    }
    expect(params.slippageBps).toBe(100)
  })

  it('SellParams with optional fields', () => {
    const params: SellParams = {
      coinType: '0xabc::coin::COIN',
      tokenAmount: '5000',
      sellerAddress: '0xseller',
    }
    expect(params.minSuiOutMist).toBeUndefined()
  })

  it('CreateTokenParams with required fields', () => {
    const params: CreateTokenParams = {
      name: 'New Token',
      symbol: 'NEW',
    }
    expect(params.name).toBe('New Token')
  })

  it('ListTokensParams with filters', () => {
    const params: ListTokensParams = {
      sort: 'volume',
      limit: 20,
      cursor: 'abc',
      graduated: false,
    }
    expect(params.sort).toBe('volume')
  })

  it('BatchBuyParams with multiple buys', () => {
    const params: BatchBuyParams = {
      buys: [
        { coinType: '0xabc::coin::COIN', suiAmountMist: '1000' },
        { coinType: '0xdef::coin::TOKEN', suiAmountMist: '2000', slippageBps: 150 },
      ],
      buyerAddress: '0xbuyer',
    }
    expect(params.buys).toHaveLength(2)
  })

  it('CopySubscribeParams with defaults', () => {
    const params: CopySubscribeParams = {
      targetWallet: '0xtarget',
      subscriberAddress: '0xsub',
    }
    expect(params.maxSuiPerTrade).toBeUndefined()
    expect(params.ratio).toBeUndefined()
  })

  it('CopySubscribeParams with all fields', () => {
    const params: CopySubscribeParams = {
      targetWallet: '0xtarget',
      subscriberAddress: '0xsub',
      maxSuiPerTrade: '5000000000',
      ratio: 0.5,
    }
    expect(params.ratio).toBe(0.5)
  })

  it('PortfolioHolding type', () => {
    const holding: PortfolioHolding = {
      coinType: '0xabc::coin::COIN',
      tokenName: 'Test',
      tokenSymbol: 'TST',
      balance: '1000',
      valueMist: '5000000',
      pnlPct: 15.5,
      avgBuyPriceMist: '4500',
      currentPriceMist: '5000',
    }
    expect(holding.pnlPct).toBe(15.5)
  })

  it('PortfolioSummary type', () => {
    const summary: PortfolioSummary = {
      holdings: [],
      totalValueMist: '0',
      totalPnlPct: 0,
      totalInvestedMist: '0',
    }
    expect(summary.holdings).toHaveLength(0)
  })

  it('NewTokenEvent type', () => {
    const event: NewTokenEvent = {
      event: 'new_token',
      coinType: '0xabc::coin::COIN',
      name: 'Test',
      symbol: 'TST',
      creator: '0xcreator',
      ts: 1234567890,
    }
    expect(event.event).toBe('new_token')
  })

  it('TradeEvent (stream) type', () => {
    const event: TradeEvent = {
      event: 'trade',
      coinType: '0xabc::coin::COIN',
      tradeType: 'buy',
      suiAmount: '1000',
      tokenAmount: '500',
      trader: '0xtrader',
      priceMist: '2',
      curveProgress: 10,
      ts: 1234567890,
    }
    expect(event.event).toBe('trade')
  })

  it('GraduationEvent type', () => {
    const event: GraduationEvent = {
      event: 'graduated',
      coinType: '0xabc::coin::COIN',
      cetusPoolId: '0xcetus',
      ts: 1234567890,
    }
    expect(event.event).toBe('graduated')
  })

  it('StreamEvent union type accepts all variants', () => {
    const events: StreamEvent[] = [
      { event: 'new_token', coinType: 'a', name: 'n', symbol: 's', creator: 'c', ts: 1 },
      { event: 'trade', coinType: 'a', tradeType: 'buy', suiAmount: '1', tokenAmount: '1', trader: 't', priceMist: '1', curveProgress: 0, ts: 1 },
      { event: 'graduated', coinType: 'a', cetusPoolId: 'c', ts: 1 },
    ]
    expect(events).toHaveLength(3)
  })

  it('all type imports are valid (compile-time check)', () => {
    const types = {
      PTBResult: null as any as PTBResult,
      SuiAddress: null as any as SuiAddress,
      CoinType: null as any as CoinType,
      MistAmount: null as any as MistAmount,
      TokenMetadata: null as any as TokenMetadata,
      TradeRecord: null as any as TradeRecord,
      SuiPumpConfig: null as any as SuiPumpConfig,
      BuyParams: null as any as BuyParams,
      SellParams: null as any as SellParams,
      CreateTokenParams: null as any as CreateTokenParams,
      ListTokensParams: null as any as ListTokensParams,
      BatchBuyParams: null as any as BatchBuyParams,
      CopySubscribeParams: null as any as CopySubscribeParams,
      PortfolioHolding: null as any as PortfolioHolding,
      PortfolioSummary: null as any as PortfolioSummary,
      StreamEvent: null as any as StreamEvent,
      NewTokenEvent: null as any as NewTokenEvent,
      TradeEvent: null as any as TradeEvent,
      GraduationEvent: null as any as GraduationEvent,
    }
    expect(Object.keys(types).length).toBe(19)
  })
})
