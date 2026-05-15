import { describe, it, expect } from 'vitest'
import {
  SuiPump,
  TokensClient,
  PortfolioClient,
  AgentClient,
  StreamClient,
  MediaClient,
} from '../src/index.js'
import type {
  SuiPumpConfig,
  PTBResult,
  SuiAddress,
  CoinType,
  MistAmount,
  TokenMetadata,
  TradeRecord,
  BuyParams,
  SellParams,
  CreateTokenParams,
  ListTokensParams,
  BatchBuyParams,
  CopySubscribeParams,
  PortfolioHolding,
  StreamEvent,
  NewTokenEvent,
  TradeStreamEvent,
  GraduationEvent,
  ChatMessageEvent,
  KothUpdateEvent,
  ReputationUpdateEvent,
} from '../src/index.js'

describe('SDK index exports', () => {
  it('exports SuiPump class', () => {
    expect(SuiPump).toBeDefined()
    expect(typeof SuiPump).toBe('function')
  })

  it('exports all client classes', () => {
    expect(TokensClient).toBeDefined()
    expect(typeof TokensClient).toBe('function')
    expect(PortfolioClient).toBeDefined()
    expect(typeof PortfolioClient).toBe('function')
    expect(AgentClient).toBeDefined()
    expect(typeof AgentClient).toBe('function')
    expect(StreamClient).toBeDefined()
    expect(typeof StreamClient).toBe('function')
    expect(MediaClient).toBeDefined()
    expect(typeof MediaClient).toBe('function')
  })

  it('exports type SuiPumpConfig (compile-time check)', () => {
    const config: SuiPumpConfig = {
      apiKey: 'test',
      client: {} as any,
      network: 'mainnet',
    }
    expect(config.apiKey).toBe('test')
  })

  it('exports PTBResult type', () => {
    const ptb: PTBResult = {
      ptbBytes: '0x',
      estimatedGasSui: '0.001',
      expectedOut: '100',
      priceImpactPct: 0.5,
    }
    expect(ptb.priceImpactPct).toBe(0.5)
  })

  it('exports SuiAddress as string alias', () => {
    const addr: SuiAddress = '0x123'
    expect(typeof addr).toBe('string')
  })

  it('exports CoinType as string alias', () => {
    const ct: CoinType = '0xabc::coin::COIN'
    expect(ct).toContain('::')
  })

  it('exports MistAmount as string alias', () => {
    const amt: MistAmount = '1000000000'
    expect(typeof amt).toBe('string')
  })

  it('exports TokenMetadata type', () => {
    const meta: TokenMetadata = {
      coinType: '0xabc::coin::COIN',
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

  it('exports TradeRecord type', () => {
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

  it('exports BuyParams with minTokensOut required and slippage', () => {
    const p: BuyParams = {
      coinType: '0x1::coin::COIN',
      suiAmountMist: '1000',
      minTokensOut: '900',
      buyerAddress: '0xaaaa',
      slippageBps: 100,
    }
    expect(p.slippageBps).toBe(100)
    expect(p.minTokensOut).toBe('900')
  })

  it('exports SellParams', () => {
    const p: SellParams = {
      coinType: '0x1::coin::COIN',
      tokenAmount: '500',
      sellerAddress: '0xcccc',
    }
    expect(p.tokenAmount).toBe('500')
  })

  it('exports CreateTokenParams with required creatorAddress', () => {
    const p: CreateTokenParams = {
      name: 'New',
      symbol: 'NEW',
      description: 'desc',
      creatorAddress: '0xcreator',
      imageBlobId: 'blob123',
    }
    expect(p.name).toBe('New')
    expect(p.creatorAddress).toBe('0xcreator')
    expect(p.imageBlobId).toBe('blob123')
  })

  it('exports ListTokensParams', () => {
    const p: ListTokensParams = {
      sort: 'volume',
      limit: 10,
    }
    expect(p.limit).toBe(10)
  })

  it('exports BatchBuyParams', () => {
    const p: BatchBuyParams = {
      buys: [{ coinType: '0x1::coin::COIN', suiAmountMist: '1000', minTokensOut: '900' }],
      buyerAddress: '0xaaaa',
    }
    expect(p.buys).toHaveLength(1)
    expect(p.buys[0].minTokensOut).toBe('900')
  })

  it('exports CopySubscribeParams', () => {
    const p: CopySubscribeParams = {
      targetTrader: '0xdddd',
      subscriber: '0xffff',
      maxSuiPerTrade: '5000000000',
      ratio: 50,
    }
    expect(p.ratio).toBe(50)
  })

  it('exports PortfolioHolding with backend shape', () => {
    const h: PortfolioHolding = {
      token: {
        coinType: '0x1::coin::COIN',
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
      },
      balance: '1000',
      valueSui: '5000000',
    }
    expect(h.balance).toBe('1000')
    expect(h.token.name).toBe('Test')
  })

  it('exports StreamEvent union variants (wrapped format)', () => {
    const e1: StreamEvent = { event: 'new_token', data: { coinType: 'c', name: 'n', symbol: 's', creator: 'c', graduated: false, curveProgress: 0 }, ts: 1 }
    const e2: StreamEvent = { event: 'trade', data: { coinType: 'c', tradeType: 'buy', suiAmount: '1', tokenAmount: '1', trader: 't', priceMist: '1', curveProgress: 0 }, ts: 1 }
    const e3: StreamEvent = { event: 'graduated', data: { coinType: 'c' }, ts: 1 }
    expect(e1.event).toBe('new_token')
    expect(e2.event).toBe('trade')
    expect(e3.event).toBe('graduated')
  })

  it('exports NewTokenEvent', () => {
    const e: NewTokenEvent = { event: 'new_token', data: { coinType: 'c', name: 'n', symbol: 's', creator: 'c', graduated: false, curveProgress: 0 }, ts: 1 }
    expect(e.data.name).toBe('n')
  })

  it('exports TradeStreamEvent', () => {
    const e: TradeStreamEvent = { event: 'trade', data: { coinType: 'c', tradeType: 'buy', suiAmount: '1', tokenAmount: '1', trader: 't', priceMist: '1', curveProgress: 0 }, ts: 1 }
    expect(e.data.tradeType).toBe('buy')
  })

  it('exports GraduationEvent', () => {
    const e: GraduationEvent = { event: 'graduated', data: { coinType: 'c' }, ts: 1 }
    expect(e.data.coinType).toBe('c')
  })

  it('exports ChatMessageEvent, KothUpdateEvent, ReputationUpdateEvent', () => {
    const c: ChatMessageEvent = { event: 'chat_message', data: { id: 'i', coinType: 'c', sender: 's', content: 'm', timestamp: 't' }, ts: 1 }
    const k: KothUpdateEvent = { event: 'koth_update', data: { coinType: 'c', name: 'n', symbol: 's', volumeSui: 'v', priceMist: 'p', marketCapSui: 'm', holderCount: 1, graduated: false }, ts: 1 }
    const r: ReputationUpdateEvent = { event: 'reputation_update', data: { address: 'a', score: 100, tier: 'bronze' }, ts: 1 }
    expect(c.data.content).toBe('m')
    expect(k.data.volumeSui).toBe('v')
    expect(r.data.tier).toBe('bronze')
  })
})
