/**
 * @suipump/sdk — Real-Time Streaming & Trading Example
 *
 * Run: npx tsx examples/stream-trading.ts
 *
 * Demonstrates:
 *   1. WebSocket event subscription (new tokens, trades, graduations)
 *   2. Building buy/sell PTBs from stream events
 *   3. Batch buying multiple tokens atomically
 *   4. Copy-trade subscription
 *   5. Media upload to Walrus
 */

import { SuiGrpcClient } from '@mysten/sui/grpc'
import { SuiPump } from '../src/index.js'
import type { TokenMetadata, TradeEvent } from '../src/types.js'
import type { BatchBuyParams } from '../src/agent.js'

// ── Config ─────────────────────────────────────────────────────

const NETWORK = 'mainnet'
const WALLET_ADDRESS = '0x_YOUR_WALLET_ADDRESS'

const client = new SuiGrpcClient({
  network: NETWORK,
  baseUrl: 'https://fullnode.mainnet.sui.io:443',
})

const pump = new SuiPump({
  apiKey: process.env.SUIPUMP_API_KEY ?? 'your-api-key',
  client,
  network: NETWORK,
})

// ── 1. Real-Time Event Streaming ───────────────────────────────

function subscribeToEvents() {
  const stream = pump.stream
    .onNewToken((event) => {
      const token: TokenMetadata = event.data
      console.log(`🆕 New token: ${token.name} (${token.symbol})`)
      console.log(`   Coin Type: ${token.coinType}`)
      console.log(`   Creator:   ${token.creatorSuiName ?? token.creatorAddress}`)
      console.log(`   MCap:      ${Number(token.marketCapSui).toFixed(2)} SUI\n`)
    })
    .onTrade((event) => {
      const trade: TradeEvent = event.data
      const emoji = trade.tradeType === 'buy' ? '🟢' : '🔴'
      console.log(
        `${emoji} ${trade.tradeType.toUpperCase()}` +
        `  ${trade.trader.slice(0, 8)}...` +
        `  |  ${Number(trade.suiAmount) / 1e9} SUI` +
        `  |  ${trade.tokenAmount} tokens` +
        `  |  ${Number(trade.priceMist) / 1e9} SUI/token`
      )
    })
    .onGraduated((event) => {
      console.log(`🎓 Token graduated! ${event.data.coinType}`)
    })
    .onKothUpdate((event) => {
      const koth = event.data
      console.log(`👑 King of the Hill: ${koth.name} (${koth.symbol}) — ${koth.volumeSui} SUI volume\n`)
    })
    .connect()

  console.log('📡 WebSocket connected — listening for events...\n')
  return stream
}

// ── 2. Build a Buy Transaction ─────────────────────────────────

async function buildBuyPTB(coinType: string, suiAmount: string) {
  const ptb = await pump.tokens.buy({
    coinType,
    suiAmountMist: suiAmount,
    minTokensOut: String(BigInt(suiAmount) * 99n / 100n), // 1% slippage
    buyerAddress: WALLET_ADDRESS,
    slippageBps: 100,
  })

  console.log(`📝 Buy PTB ready:`)
  console.log(`   Expected out: ${Number(ptb.expectedOut) / 1e9} tokens`)
  console.log(`   Gas:          ${ptb.estimatedGasSui} SUI`)
  console.log(`   Price impact: ${ptb.priceImpactPct.toFixed(2)}%\n`)

  // In production, sign and submit with dApp Kit:
  // const { bytes, signature } = await signTransaction({ transaction: ptb.ptbBytes })
  // const result = await client.core.executeTransaction({ transaction: bytes, signature })

  return ptb
}

// ── 3. Build a Sell Transaction ────────────────────────────────

async function buildSellPTB(coinType: string, tokenAmount: string) {
  const ptb = await pump.tokens.sell({
    coinType,
    tokenAmount,
    sellerAddress: WALLET_ADDRESS,
    slippageBps: 100,
  })

  console.log(`📝 Sell PTB ready:`)
  console.log(`   Expected out: ${Number(ptb.expectedOut) / 1e9} SUI`)
  console.log(`   Gas:          ${ptb.estimatedGasSui} SUI`)
  console.log(`   Price impact: ${ptb.priceImpactPct.toFixed(2)}%\n`)

  return ptb
}

// ── 4. Atomic Batch Buy ────────────────────────────────────────
//
// Buy up to 10 tokens in a single atomic transaction.
// Either ALL buys succeed or NONE do — enforced at the protocol level.

async function batchBuy(buys: BatchBuyParams['buys']) {
  const ptb = await pump.agent.batchBuy({
    buys,
    buyerAddress: WALLET_ADDRESS,
  })

  console.log(`📦 Batch Buy PTB (${buys.length} tokens):`)
  console.log(`   Expected out: ${Number(ptb.expectedOut) / 1e9} total SUI value`)
  console.log(`   Gas:          ${ptb.estimatedGasSui} SUI\n`)

  return ptb
}

// ── 5. Copy-Trade Subscription ─────────────────────────────────

async function subscribeToTrader(targetAddress: string) {
  const sub = await pump.agent.copySubscribe({
    targetTrader: targetAddress,
    subscriber: WALLET_ADDRESS,
    maxSuiPerTrade: '1000000000', // 1 SUI max per copy trade
    ratio: 50,                    // 50% of target's trade size
  })

  console.log(`🔄 Copy-trade subscription active:`)
  console.log(`   ID:      ${sub.subscriptionId}`)
  console.log(`   Trader:  ${sub.targetTrader}`)
  console.log(`   Status:  ${sub.status}\n`)

  return sub
}

// ── 6. Media Upload ────────────────────────────────────────────

async function uploadMedia() {
  // Read and base64-encode a local image
  const fs = await import('fs/promises')
  const imageData = await fs.readFile('./examples/meme.png')
  const base64 = imageData.toString('base64')

  const { blobId } = await pump.media.upload(base64, 'image/png')
  const url = pump.media.getUrl(blobId)

  console.log(`🖼️  Media uploaded:`)
  console.log(`   Blob ID: ${blobId}`)
  console.log(`   URL:     ${url}\n`)

  return blobId
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  try {
    // Start WebSocket stream (runs until Ctrl+C)
    const stream = subscribeToEvents()

    // Example: build a buy PTB
    // await buildBuyPTB('0x_PUMP_TOKEN_COIN_TYPE', '1000000000')

    // Example: batch buy
    // await batchBuy([
    //   { coinType: '0x_TOKEN_1', suiAmountMist: '500000000', minTokensOut: '490000000' },
    //   { coinType: '0x_TOKEN_2', suiAmountMist: '500000000', minTokensOut: '490000000' },
    // ])

    // Example: copy trade
    // await subscribeToTrader('0x_SMART_TRADER_ADDRESS')

    // Keep process alive for WebSocket events
    process.on('SIGINT', () => {
      console.log('\n👋 Disconnecting...')
      stream.disconnect()
      process.exit(0)
    })
  } catch (err) {
    console.error('❌ Error:', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

main()
