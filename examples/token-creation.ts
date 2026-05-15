/**
 * @suipump/sdk — Token Creation Example (2-Click OTW Flow)
 *
 * Run: npx tsx examples/token-creation.ts
 *
 * This demonstrates the complete 2-click OTW (One-Time Witness) creation flow:
 *   Step 1: Prepare publish → User signs Tx 1 (deploy OTW package)
 *   Step 2: Confirm create  → User signs Tx 2 (create bonding curve)
 *
 * WARNING: This example will SUBMIT TRANSACTIONS to the network.
 * Run against devnet/testnet first.
 */

import { SuiGrpcClient } from '@mysten/sui/grpc'
import { SuiPump } from '../src/index.js'
import { Transaction } from '@mysten/sui/transactions'

// ── Config ─────────────────────────────────────────────────────

const NETWORK = 'devnet'
const CREATOR_ADDRESS = '0x_YOUR_ADDRESS_HERE'

const client = new SuiGrpcClient({
  network: NETWORK,
  baseUrl: 'https://fullnode.devnet.sui.io:443',
})

const pump = new SuiPump({
  apiKey: process.env.SUIPUMP_API_KEY ?? 'your-api-key',
  client,
  network: NETWORK,
})

// ── Step 0: Check creation fee ────────────────────────────────

async function checkFee() {
  const info = await pump.tokens.getCreationInfo()
  console.log(`Creation fee: ${info.creationFeeSui} SUI (${info.creationFeeMist} MIST)`)
  console.log(`Note: ${info.note}\n`)
}

// ── Step 1: Prepare Publish ────────────────────────────────────
//
// Backend generates a minimal OTW Move package from your token name/symbol.
// Returns an unsigned PTB for publishing the package.

async function preparePublish() {
  const result = await pump.tokens.preparePublish({
    name: 'My Awesome Token',
    symbol: 'AWE',
    description: 'An awesome token created via @suipump/sdk',
    creatorAddress: CREATOR_ADDRESS,
    twitter: '@my_token',
    telegram: 'https://t.me/my_token',
    website: 'https://my-token.com',
  })

  console.log('📦 Prepare Publish Response:')
  console.log(`  OTW Module:  ${result.otwModuleName}`)
  console.log(`  OTW Name:    ${result.otwName}`)
  console.log(`  Metadata:    ${result.metadataBlobId}`)
  console.log(`  Gas (est.):  ${result.estimatedGasSui} SUI`)
  console.log(`  Fee:         ${Number(result.creationFeeMist) / 1e9} SUI`)
  console.log(`  Steps:       ${result.steps.join(' → ')}`)
  console.log(`  Tx bytes:    ${result.publishTxBytes.slice(0, 64)}...\n`)

  return result
}

// ── Step 2 (Simulated): Sign & Submit Publish Transaction ─────
//
// In a real dApp, you would:
//   1. Deserialize the tx bytes into a Transaction
//   2. Have the user sign with their wallet (dApp Kit, Enoki, etc.)
//   3. Submit to the Sui network
//   4. Extract the published package ID from the tx effects
//
// Example (pseudo-code):
//   const tx = Transaction.from(result.publishTxBytes)
//   const { digest } = await signAndExecute(tx)
//   const effects = await waitForTransaction(digest)
//   const publishedPackageId = effects.created?.[0]?.reference?.objectId

async function simulatePublish(publishTxBytes: string): Promise<{
  publishedPackageId: string
  treasuryCapObjectId: string
  coinMetadataObjectId: string
}> {
  console.log('🔑 [SIMULATED] User signs Tx 1 (Publish OTW Package)')
  console.log('   In production, this happens client-side via dApp Kit.\n')

  // ── Parse transaction to inspect package info ──
  const tx = Transaction.from(Buffer.from(publishTxBytes, 'base64'))

  // In production, after execution, extract these from transaction effects:
  return {
    publishedPackageId: '0x_PACKAGE_ID_FROM_TX_EFFECTS',
    treasuryCapObjectId: '0x_TREASURY_CAP_ID_FROM_TX_EFFECTS',
    coinMetadataObjectId: '0x_COIN_METADATA_ID_FROM_TX_EFFECTS',
  }
}

// ── Step 3: Confirm Create ─────────────────────────────────────
//
// After the package is published, confirm the token creation.
// This creates the BondingCurve, registers the token, initializes the vault.

async function confirmCreate(details: {
  publishedPackageId: string
  treasuryCapObjectId: string
  coinMetadataObjectId: string
}) {
  const result = await pump.tokens.confirmCreate({
    name: 'My Awesome Token',
    symbol: 'AWE',
    description: 'An awesome token created via @suipump/sdk',
    creatorAddress: CREATOR_ADDRESS,
    twitter: '@my_token',
    telegram: 'https://t.me/my_token',
    website: 'https://my-token.com',
    publishedPackageId: details.publishedPackageId,
    treasuryCapObjectId: details.treasuryCapObjectId,
    coinMetadataObjectId: details.coinMetadataObjectId,
  })

  console.log('✅ Token Created!')
  console.log(`  Name:      ${result.token.name} (${result.token.symbol})`)
  console.log(`  Coin Type: ${result.token.coinType}`)
  console.log(`  Tx Hash:   ${result.creationTxHash}`)
  console.log(`  Curve ID:  ${result.token.curveObjectId}\n`)

  // Now the token is live on the bonding curve!
  // Users can buy/sell via pump.tokens.buy() / pump.tokens.sell()
  //
  // Example buy:
  // const buyPtb = await pump.tokens.buy({
  //   coinType: result.token.coinType,
  //   suiAmountMist: '1000000000',   // 1 SUI
  //   minTokensOut: '990000000',
  //   buyerAddress: CREATOR_ADDRESS,
  //   slippageBps: 50,               // 0.5% slippage
  // })

  return result
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  try {
    await checkFee()

    const publishResult = await preparePublish()
    const published = await simulatePublish(publishResult.publishTxBytes)
    await confirmCreate(published)

    console.log('🎉 Token creation flow complete!')
  } catch (err) {
    console.error('❌ Error:', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

main()
