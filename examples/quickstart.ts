/**
 * @suipump/sdk — Quickstart Example
 *
 * Run: npx tsx examples/quickstart.ts
 *
 * This example demonstrates the basic SDK setup and common read-only operations.
 * No transactions are submitted — safe to run against any network.
 */

import { SuiGrpcClient } from '@mysten/sui/grpc'
import { SuiPump } from '../src/index.js'

// ── 1. Initialize ──────────────────────────────────────────────

const client = new SuiGrpcClient({
  network: 'mainnet',
  baseUrl: 'https://fullnode.mainnet.sui.io:443',
})

const pump = new SuiPump({
  apiKey: process.env.SUIPUMP_API_KEY ?? 'your-api-key',
  client,
  network: 'mainnet',
})

// ── 2. List tokens ─────────────────────────────────────────────

async function listTokens() {
  const { tokens, limit } = await pump.tokens.list({
    sort: 'volume',
    limit: 10,
  })

  console.log(`\nTop ${limit} tokens by volume:\n`)
  for (const t of tokens) {
    console.log(
      `  ${t.symbol} — $${Number(t.marketCapSui).toFixed(2)} MCap` +
      `  |  ${t.holderCount} holders  |  ${t.curveProgress.toFixed(1)}% progressed`
    )
  }
}

// ── 3. Get single token ────────────────────────────────────────

async function getToken(coinType: string) {
  const token = await pump.tokens.get(coinType)
  console.log(`\nToken: ${token.name} (${token.symbol})`)
  console.log(`  Price:     ${Number(token.currentPriceMist) / 1e9} SUI`)
  console.log(`  Volume:    ${token.totalVolumeSui} SUI`)
  console.log(`  Creator:   ${token.creatorSuiName ?? token.creatorAddress}`)
  console.log(`  Graduated: ${token.graduated ? '✅ Yes' : '❌ No'}`)
  console.log(`  Progress:  ${token.curveProgress.toFixed(1)}%`)
  return token
}

// ── 4. Portfolio overview ─────────────────────────────────────

async function showPortfolio(address: string) {
  const overview = await pump.portfolio.getOverview(address)
  console.log(`\nPortfolio: ${overview.address}`)
  console.log(`  SUI Balance:     ${Number(overview.suiBalance) / 1e9} SUI`)
  console.log(`  Portfolio Value: ${Number(overview.portfolioValueSui) / 1e9} SUI`)
  console.log(`  Holdings:        ${overview.holdingsCount}`)
  console.log(`  Trades Today:    ${overview.tradesTodayCount}`)

  const { holdings } = await pump.portfolio.getHoldings(address)
  for (const h of holdings) {
    console.log(`  • ${h.token.symbol}: ${Number(h.balance).toLocaleString()} tokens (${Number(h.valueSui) / 1e9} SUI)`)
  }
}

// ── Run ────────────────────────────────────────────────────────

async function main() {
  try {
    await listTokens()

    // Replace with a real coin type from the list output above
    // await getToken('0xCASTER...::caster::CASTER')

    // Replace with your wallet address
    // await showPortfolio('0x1234...dead')

    console.log('\n✅ Quickstart complete — no transactions submitted.')
  } catch (err) {
    console.error('❌ Error:', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

main()
