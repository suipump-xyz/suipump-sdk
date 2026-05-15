<p align="center">
  <img src="assets/architecture.svg" alt="SuiPump SDK" width="100%" />
</p>

<h1 align="center">@suipump/sdk</h1>

<p align="center">
  <strong>TypeScript SDK for the SuiPump Token Lifecycle Operating System</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@suipump/sdk"><img src="https://img.shields.io/npm/v/@suipump/sdk?style=flat&logo=npm&label=version&color=6B46C1" alt="npm" /></a>
  <a href="#"><img src="https://img.shields.io/badge/MIT-License-6B46C1?style=flat" alt="license" /></a>
  <a href="https://sui.io"><img src="assets/sui-badge.svg" alt="Sui" /></a>
  <a href="#"><img src="assets/coverage-badge.svg" alt="coverage" /></a>
  <a href="https://github.com/suipump-xyz/suipump-sdk"><img src="https://img.shields.io/github/stars/suipump-xyz/suipump-sdk?style=flat&logo=github&color=6B46C1" alt="stars" /></a>
</p>

<br />

> **SuiPump** is not a pump.fun clone. It is a token lifecycle operating system built on Sui — from creation to bonding curve to Cetus graduation, every stage lives in one ecosystem. This SDK gives developers typed, production-grade access to the entire platform.

<br />

---

## Features

- **2-Click Token Creation** — OTW-based flow: publish package, create bonding curve. Two transactions, token is live.
- **Unsigned PTB Architecture** — Backend builds transactions, you sign them. The platform never touches your keys.
- **Real-Time WebSocket Streams** — New tokens, trades, graduations, chat messages, King of the Hill updates, reputation changes.
- **Atomic Batch Operations** — Buy up to 10 tokens in a single PTB. Either all succeed or none do.
- **Copy-Trade Automation** — Subscribe to a target trader, receive pre-built scaled PTBs via webhook.
- **Walrus Media Upload** — Upload token images permanently to decentralized storage.
- **Portfolio Tracking** — Holdings, trade history, portfolio overview with SuiNS name resolution.
- **Transport-Agnostic** — Works with any `ClientWithCoreApi` (gRPC, GraphQL, JSON-RPC).

---

## Installation

```bash
npm install @suipump/sdk
```

**Peer dependency** (required):

```bash
npm install @mysten/sui
```

---

## Quick Start

```typescript
import { SuiGrpcClient } from '@mysten/sui/grpc'
import { SuiPump } from '@suipump/sdk'

const client = new SuiGrpcClient({
  network: 'mainnet',
  baseUrl: 'https://fullnode.mainnet.sui.io:443',
})

const pump = new SuiPump({
  apiKey: process.env.SUIPUMP_API_KEY,
  client,
  network: 'mainnet',
})

// List trending tokens
const { tokens } = await pump.tokens.list({ sort: 'volume', limit: 10 })
for (const t of tokens) {
  console.log(`${t.symbol} — ${t.marketCapSui} MCap, ${t.holderCount} holders`)
}

// Get token details
const token = await pump.tokens.get('0x...::module::COIN')
console.log(token.name, token.currentPriceMist, token.curveProgress)
```

> See [`examples/quickstart.ts`](./examples/quickstart.ts) for a runnable version.

---

## Token Lifecycle

<p align="center">
  <img src="assets/token-lifecycle.svg" alt="Token Lifecycle" width="90%" />
</p>

Every token on SuiPump passes through five distinct stages. The SDK provides methods for each:

| Stage | SDK Methods | Description |
|-------|-------------|-------------|
| **1. Discovery** | `tokens.list()`, `tokens.get()` | Browse trending, new, and nearly-graduated tokens |
| **2. Creation** | `tokens.preparePublish()`, `tokens.confirmCreate()` | 2-click OTW flow — deploy coin type, create bonding curve |
| **3. Bonding Curve** | `tokens.buy()`, `tokens.sell()` | Trade against the constant-product bonding curve AMM |
| **4. Graduation** | `stream.onGraduated()` | Automatic Cetus CLMM pool creation at threshold |
| **5. Post-Graduation** | `tokens.get()`, `portfolio.*()` | Cetus AMM trading, portfolio tracking, analytics |

---

## Architecture

<p align="center">
  <img src="assets/architecture.svg" alt="Architecture" width="100%" />
</p>

### Domain-Based Isolation

The SDK is one of four independent build domains in the SuiPump monorepo:

```
suipump/
├── contracts/    ← Move smart contracts (13 modules)
├── backend/      ← Node.js API + indexer + PTB builder
├── frontend/     ← Next.js dApp (not needed for SDK usage)
└── sdk/ ← you are here
```

The SDK wraps the Backend REST API and the Sui blockchain interface. It requires no running frontend, no database, and no blockchain node — just an API key.

---

## API Reference

### `SuiPump` (main class)

```typescript
import { SuiPump } from '@suipump/sdk'
import type { ClientWithCoreApi } from '@mysten/sui/client'

const pump = new SuiPump(options: SuiPumpConfig)
```

**`SuiPumpConfig`:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `apiKey` | `string` | — | Your SuiPump API key |
| `client` | `ClientWithCoreApi` | — | Any Sui client (gRPC, GraphQL, JSON-RPC) |
| `network` | `'devnet' \| 'testnet' \| 'mainnet'` | `'mainnet'` | Sui network |
| `apiBaseUrl` | `string` | `https://api.{network}.suipump.xyz/v1` | Custom API endpoint |
| `wsUrl` | `string` | `wss://stream.{network}.suipump.xyz/v1` | Custom WebSocket endpoint |

**Sub-clients:**

| Property | Type | Description |
|----------|------|-------------|
| `pump.tokens` | `TokensClient` | Token metadata, creation, trading |
| `pump.portfolio` | `PortfolioClient` | Holdings, trades, overview |
| `pump.agent` | `AgentClient` | Batch buy, copy-trade subscriptions |
| `pump.stream` | `StreamClient` | WebSocket real-time events |
| `pump.media` | `MediaClient` | Walrus media upload |

---

### `TokensClient`

#### `tokens.get(coinType: string): Promise<TokenMetadata>`

Get full metadata and current state for a single token.

```typescript
const token = await pump.tokens.get('0xCASTER...::caster::CASTER')
// {
//   coinType: '0xCASTER...::caster::CASTER',
//   name: 'Caster',
//   symbol: 'CASTER',
//   currentPriceMist: '1250000',
//   marketCapSui: '1250000.000000',
//   curveProgress: 42.7,
//   graduated: false,
//   holderCount: 183,
//   totalVolumeSui: '8472300.000000',
//   creatorSuiName: 'caster.sui',
//   walrusBlobId: '...',
//   ...
// }
```

#### `tokens.list(params?: ListTokensParams): Promise<{ tokens: TokenMetadata[]; limit: number; offset: number }>`

List tokens with optional filtering.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `sort` | `'volume' \| 'created' \| 'market_cap'` | `'created'` | Sort order |
| `limit` | `number` | `50` | Results per page |
| `offset` | `number` | `0` | Pagination offset |
| `graduated` | `boolean` | — | Filter by graduation status |

```typescript
// Top 20 by volume
const { tokens, limit, offset } = await pump.tokens.list({
  sort: 'volume', limit: 20
})

// Graduated tokens
const graduated = await pump.tokens.list({ graduated: true, sort: 'market_cap' })
```

#### `tokens.getCreationInfo(): Promise<CreationInfo>`

Get the current creation fee and endpoint info.

```typescript
const info = await pump.tokens.getCreationInfo()
// { creationFeeSui: '0.5', creationFeeMist: '500000000', ... }
```

#### `tokens.preparePublish(params: CreateTokenParams): Promise<PublishResult>`

**Step 1 of the 2-click OTW flow.** The backend generates a minimal OTW Move package from your token info and returns an unsigned publish transaction.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | ✅ | Token name |
| `symbol` | `string` | ✅ | Token symbol (max 10 chars) |
| `description` | `string` | | Token description |
| `creatorAddress` | `string` | ✅ | Creator's Sui address |
| `imageBlobId` | `string` | | Walrus blob ID (upload via `media.upload()`) |
| `twitter` | `string` | | Twitter handle |
| `telegram` | `string` | | Telegram invite link |
| `website` | `string` | | Website URL |

```typescript
const result = await pump.tokens.preparePublish({
  name: 'My Token',
  symbol: 'MTK',
  description: 'My awesome token',
  creatorAddress: '0x...',
  imageBlobId: 'blob-id-from-media-upload',
})
// { publishTxBytes: '...', otwModuleName: 'my_token', otwName: 'MTK', ... }
```

#### `tokens.confirmCreate(params: ConfirmCreateParams): Promise<{ token: TokenMetadata; creationTxHash: string }>`

**Step 2 of the 2-click OTW flow.** After the user publishes the OTW package, confirm the token creation. This creates the BondingCurve, registers the token, and initializes the creator vault.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | ✅ | Must match `preparePublish` |
| `symbol` | `string` | ✅ | Must match `preparePublish` |
| `description` | `string` | | |
| `creatorAddress` | `string` | ✅ | |
| `publishedPackageId` | `string` | ✅ | Package ID from publish tx effects |
| `treasuryCapObjectId` | `string` | ✅ | TreasuryCap from publish tx effects |
| `coinMetadataObjectId` | `string` | ✅ | CoinMetadata from publish tx effects |
| `imageBlobId` | `string` | | |

```typescript
const { token, creationTxHash } = await pump.tokens.confirmCreate({
  name: 'My Token',
  symbol: 'MTK',
  creatorAddress: '0x...',
  publishedPackageId: '0x...',
  treasuryCapObjectId: '0x...',
  coinMetadataObjectId: '0x...',
})
```

> **Full creation flow:** See [`examples/token-creation.ts`](./examples/token-creation.ts)

#### `tokens.buy(params: BuyParams): Promise<PTBResult>`

Build an unsigned buy PTB. Returns base64-encoded transaction bytes that the user signs and submits.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `coinType` | `string` | — | Token's full coin type |
| `suiAmountMist` | `string` | — | Amount of SUI to spend (in MIST) |
| `minTokensOut` | `string` | — | Minimum tokens to receive (slippage protection) |
| `buyerAddress` | `string` | — | Buyer's Sui address |
| `slippageBps` | `number` | `50` | Slippage tolerance in basis points (50 = 0.5%) |

```typescript
const ptb = await pump.tokens.buy({
  coinType: '0x...::my_token::MY_TOKEN',
  suiAmountMist: '1000000000', // 1 SUI
  minTokensOut: '990000000',   // 1% slippage
  buyerAddress: '0x...',
  slippageBps: 100,
})
// {
//   ptbBytes: 'AAAC...',        // ← base64 Transaction bytes
//   estimatedGasSui: '0.001',   // estimated gas cost
//   expectedOut: '995000000',   // expected token output
//   priceImpactPct: 0.85,       // price impact percentage
// }
```

#### `tokens.sell(params: SellParams): Promise<PTBResult>`

Build an unsigned sell PTB.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `coinType` | `string` | — | Token's full coin type |
| `tokenAmount` | `string` | — | Amount of tokens to sell |
| `minSuiOutMist` | `string` | — | Minimum SUI to receive |
| `sellerAddress` | `string` | — | Seller's Sui address |
| `slippageBps` | `number` | `50` | Slippage tolerance in basis points |

```typescript
const ptb = await pump.tokens.sell({
  coinType: '0x...::my_token::MY_TOKEN',
  tokenAmount: '1000000',
  sellerAddress: '0x...',
  slippageBps: 100,
})
```

---

### `PortfolioClient`

#### `portfolio.getHoldings(address: string): Promise<{ address: SuiAddress; holdings: PortfolioHolding[] }>`

Get all token holdings for an address.

```typescript
const { address, holdings } = await pump.portfolio.getHoldings('0x...')
// Each holding: { token: TokenMetadata, balance: string, valueSui: string }
```

#### `portfolio.getTrades(address: string, params?: { limit?: number }): Promise<{ address: SuiAddress; trades: TradeRecord[]; limit: number }>`

Get trade history for an address.

```typescript
const { trades } = await pump.portfolio.getTrades('0x...', { limit: 50 })
// Each trade: { txHash, coinType, tradeType, suiAmount, tokenAmount, priceMist, timestamp }
```

#### `portfolio.getOverview(address: string): Promise<PortfolioOverview>`

Get a portfolio summary with balances and activity counts.

```typescript
const overview = await pump.portfolio.getOverview('0x...')
// { address, suiBalance, portfolioValueSui, holdingsCount, tradesTodayCount, totalTrades }
```

---

### `AgentClient`

#### `agent.batchBuy(params: BatchBuyParams): Promise<PTBResult>`

Build a single PTB that buys up to 10 tokens atomically. Either all buys succeed or none do — enforced at the protocol level. Requires **Agent tier** API key.

| Param | Type | Description |
|-------|------|-------------|
| `buys` | `Array<{ coinType, suiAmountMist, minTokensOut, slippageBps? }>` | Token buy specs |
| `buyerAddress` | `string` | Buyer's Sui address |

```typescript
const ptb = await pump.agent.batchBuy({
  buys: [
    { coinType: '0x...::a::A', suiAmountMist: '1000000000', minTokensOut: '990000000' },
    { coinType: '0x...::b::B', suiAmountMist: '500000000', minTokensOut: '495000000' },
    { coinType: '0x...::c::C', suiAmountMist: '250000000', minTokensOut: '247500000' },
  ],
  buyerAddress: '0x...',
})
```

#### `agent.copySubscribe(params: CopySubscribeParams): Promise<CopySubscription>`

Subscribe to a target trader. Every time they trade, the platform sends a webhook with a pre-built scaled PTB.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `targetTrader` | `string` | — | Target wallet address to follow |
| `subscriber` | `string` | — | Your wallet address |
| `maxSuiPerTrade` | `string` | `'1000000000'` | Max SUI per copy trade (MIST) |
| `ratio` | `number` | `100` | Percentage of target's trade size |

```typescript
const sub = await pump.agent.copySubscribe({
  targetTrader: '0x_SMART_TRADER',
  subscriber: '0x_MY_WALLET',
  maxSuiPerTrade: '2000000000',  // 2 SUI max per trade
  ratio: 50,                      // Copy 50% of target's size
})
// { subscriptionId, targetTrader, subscriber, maxSuiPerTrade, ratio, status, message }
```

#### `agent.unsubscribe(subscriptionId: string): Promise<UnsubscribeResult>`

Cancel a copy-trade subscription.

```typescript
await pump.agent.unsubscribe('sub-id-here')
```

---

### `StreamClient` (WebSocket)

The stream client provides real-time event subscriptions with automatic reconnection.

```typescript
const stream = pump.stream
  .onNewToken((event) => {
    // { event: 'new_token', data: TokenMetadata, ts: number }
    console.log('New token:', event.data.name)
  })
  .onTrade((event) => {
    // { event: 'trade', data: TradeEvent, ts: number }
    console.log('Trade:', event.data.tradeType, event.data.suiAmount)
  })
  .onGraduated((event) => {
    // { event: 'graduated', data: { coinType: string }, ts: number }
    console.log('Graduation!', event.data.coinType)
  })
  .onChatMessage((event) => {
    // { event: 'chat_message', data: ChatMessage, ts: number }
  })
  .onKothUpdate((event) => {
    // { event: 'koth_update', data: KothData, ts: number }
    console.log('New KOTH:', event.data.name)
  })
  .onReputationUpdate((event) => {
    // { event: 'reputation_update', data: ReputationData, ts: number }
  })
  .connect() // Start the WebSocket connection

// Remove handlers
stream.offNewToken(handler)
stream.offTrade(handler)

// Manual connect/disconnect
stream.connect()
stream.disconnect()

// Check connection
if (stream.isConnected()) {
  console.log('✅ WebSocket connected')
}
```

> **Full streaming example:** [`examples/stream-trading.ts`](./examples/stream-trading.ts)

---

### `MediaClient` (Walrus)

#### `media.upload(data: string, contentType: string): Promise<{ blobId: string }>`

Upload base64-encoded data to Walrus decentralized storage.

```typescript
const { blobId } = await pump.media.upload(
  'iVBORw0KGgo...',  // base64-encoded image
  'image/png'
)
```

#### `media.getUrl(blobId: string, network?: 'mainnet' | 'testnet'): string`

Get the Walrus aggregator URL for a blob.

```typescript
const url = pump.media.getUrl(blobId)
// https://aggregator.walrus-mainnet.walrus.space/v1/{blobId}
```

---

## Types

```typescript
import type {
  // Branded types
  SuiAddress,           // string — Sui address
  CoinType,             // string — Full coin type (0xPKG::mod::NAME)
  MistAmount,           // string — Amount in MIST (1 SUI = 1e9 MIST)

  // Token data
  TokenMetadata,        // Full token info with market data
  TradeRecord,          // Individual trade record

  // PTB building
  PTBResult,            // { ptbBytes, estimatedGasSui, expectedOut, priceImpactPct }

  // Portfolio
  PortfolioHolding,     // { token, balance, valueSui }
  PortfolioOverview,    // { address, suiBalance, portfolioValueSui, ... }

  // Real-time
  StreamEvent,          // Union type of all WebSocket events
  NewTokenEvent,
  TradeStreamEvent,
  GraduationEvent,
  ChatMessageEvent,
  KothUpdateEvent,
  ReputationUpdateEvent,

  // Chat & media
  ChatMessage,
  GatedContent,
  KothData,
  ReputationData,
} from '@suipump/sdk'
```

---

## Networks

| Network | gRPC Endpoint | API Base URL | WebSocket URL |
|---------|---------------|--------------|---------------|
| **mainnet** | `https://fullnode.mainnet.sui.io:443` | `https://api.mainnet.suipump.xyz/v1` | `wss://stream.mainnet.suipump.xyz/v1` |
| **testnet** | `https://fullnode.testnet.sui.io:443` | `https://api.testnet.suipump.xyz/v1` | `wss://stream.testnet.suipump.xyz/v1` |
| **devnet** | `https://fullnode.devnet.sui.io:443` | `https://api.devnet.suipump.xyz/v1` | `wss://stream.devnet.suipump.xyz/v1` |

---

## Examples

| File | Description |
|------|-------------|
| [`examples/quickstart.ts`](./examples/quickstart.ts) | SDK setup, list tokens, get metadata, portfolio overview |
| [`examples/token-creation.ts`](./examples/token-creation.ts) | Complete 2-click OTW token creation flow |
| [`examples/stream-trading.ts`](./examples/stream-trading.ts) | WebSocket subscriptions, buy/sell PTB building, batch buy, copy-trade, media upload |

Run any example:

```bash
SUIPUMP_API_KEY=your-key npx tsx examples/quickstart.ts
```

---

## Error Handling

All methods throw typed errors on failure:

```typescript
try {
  const token = await pump.tokens.get('0x...')
} catch (err) {
  if (err instanceof Error) {
    // API errors include HTTP status: "API error: 404 - Not found"
    // Network errors: "TypeError: fetch failed"
    console.error(err.message)
  }
}
```

---

## API Tiers

| Tier | Rate Limit | Access |
|------|-----------|--------|
| **Free** | 60 req/min | Read-only endpoints (`GET`), streams |
| **Pro** | 600 req/min | All endpoints including PTB building |
| **Agent** | 6,000 req/min | Batch buy, copy-trade, priority stream |

---

## Contributing

```bash
git clone https://github.com/suipump-xyz/suipump-sdk.git
cd sdk
npm install
npm test          # Run test suite
npm run typecheck # Type-check all files
npm run build     # Build to dist/
```

### Project Structure

```
sdk/
├── src/
│   ├── client.ts        ← Main SuiPump class
│   ├── tokens.ts        ← Token creation, trading, metadata
│   ├── portfolio.ts     ← Portfolio holdings and history
│   ├── agent.ts         ← Batch buy, copy-trade
│   ├── stream.ts        ← WebSocket event streaming
│   ├── media.ts         ← Walrus media upload
│   ├── types.ts         ← All TypeScript interfaces
│   └── index.ts         ← Public exports
├── tests/               ← Vitest test suite (186+ tests)
│   ├── tokens.test.ts
│   ├── portfolio.test.ts
│   ├── agent.test.ts
│   ├── media.test.ts
│   ├── stream.test.ts
│   └── index.test.ts
├── examples/            ← Runnable example files
│   ├── quickstart.ts
│   ├── token-creation.ts
│   └── stream-trading.ts
├── docs/                ← Architecture & vision docs
│   ├── ARCHITECTURE.md
│   └── VISION.md
└── assets/              ← SVG diagrams & badges
    ├── architecture.svg
    ├── token-lifecycle.svg
    ├── sui-badge.svg
    └── coverage-badge.svg
```

---

## License

MIT © SuiPump XYZ

<br />

<p align="center">
  <sub>Built on <a href="https://sui.io">Sui</a>.
  Powered by <a href="https://www.walrus.xyz">Walrus</a>,
  <a href="https://cetus.zone">Cetus</a>,
  <a href="https://suins.io">SuiNS</a>, and
  <a href="https://enoki.mystenlabs.com">Enoki</a>.</sub>
</p>
