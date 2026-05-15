# @suipump/sdk

TypeScript SDK for SuiPump — the token lifecycle operating system on Sui (see docs/VISION.md).

## Installation

```bash
npm install @suipump/sdk
```

## Quick Start

```typescript
import { SuiGrpcClient } from '@mysten/sui/grpc'
import { SuiPump } from '@suipump/sdk'

const client = new SuiGrpcClient({
  network: 'mainnet',
  baseUrl: 'https://fullnode.mainnet.sui.io:443',
})

const pump = new SuiPump({
  apiKey: 'your-api-key',
  client,
  network: 'mainnet',
})
```

## API Overview

### Tokens

```typescript
// Get token metadata
const token = await pump.tokens.get('0x...')

// List all tokens
const { tokens, limit, offset } = await pump.tokens.list({ limit: 20 })

// Create a token (2-click OTW flow)
// Step 1: Get creation fee info
const info = await pump.tokens.getCreationInfo()

// Step 2: Prepare publish (generates OTW package + publish PTB)
const { publishTxBytes, otwModuleName, otwName } = await pump.tokens.preparePublish({
  name: 'My Token',
  symbol: 'MTK',
  description: 'My awesome token',
  creatorAddress: '0x...',
  imageBlobId: '...', // Optional Walrus blob ID
})

// Step 3: Sign & submit the publish transaction on-chain

// Step 4: Confirm creation (after publish is confirmed)
const { token, creationTxHash } = await pump.tokens.confirmCreate({
  name: 'My Token',
  symbol: 'MTK',
  description: 'My awesome token',
  creatorAddress: '0x...',
  publishedPackageId: '0x...',
  treasuryCapObjectId: '0x...',
  coinMetadataObjectId: '0x...',
  imageBlobId: '...',
})

// Get buy PTB (unsigned transaction)
const buyPtb = await pump.tokens.buy({
  coinType: '0x...',
  suiAmountMist: '1000000000', // 1 SUI in MIST
  minTokensOut: '990000000',   // Slippage: at least 99% of expected
  buyerAddress: '0x...',
  slippageBps: 50,
})

// Get sell PTB
const sellPtb = await pump.tokens.sell({
  coinType: '0x...',
  tokenAmount: '1000000',
  sellerAddress: '0x...',
  slippageBps: 50,
})
```

### Portfolio

```typescript
// Get holdings
const { address, holdings } = await pump.portfolio.getHoldings('0x...')
// Each holding: { token: TokenMetadata, balance: string, valueSui: string }

// Get trade history
const { trades, limit } = await pump.portfolio.getTrades('0x...')

// Get portfolio overview (balances + activity)
const overview = await pump.portfolio.getOverview('0x...')
```

### Agent

```typescript
// Batch buy multiple tokens atomically
const batchPtb = await pump.agent.batchBuy({
  buys: [
    { coinType: '0x...', suiAmountMist: '1000000000', minTokensOut: '990000000' },
    { coinType: '0x...', suiAmountMist: '500000000', minTokensOut: '495000000' },
  ],
  buyerAddress: '0x...',
})

// Copy trade subscription
const subscription = await pump.agent.copySubscribe({
  targetTrader: '0x...', // Trader to follow
  subscriber: '0x...',   // Your wallet
  maxSuiPerTrade: '1000000000',
  ratio: 100, // 100% of target's trade size
})
```

### Stream (WebSocket)

```typescript
const stream = pump.stream
  .onNewToken((event) => {
    console.log('New token created:', event.data.name)
  })
  .onTrade((event) => {
    console.log(`Trade: ${event.data.tradeType} ${event.data.tokenAmount} tokens`)
  })
  .onGraduated((event) => {
    console.log('Token graduated to Cetus!')
  })
  .connect()

// Later: disconnect
stream.disconnect()
```

### Media (Walrus)

```typescript
// Upload image/file (base64 encoded)
const { blobId } = await pump.media.upload('base64encodeddata', 'image/png')

// Get Walrus aggregator URL
const url = pump.media.getUrl(blobId)
// https://aggregator.walrus-mainnet.walrus.space/v1/{blobId}
```

## Types

```typescript
import type {
  SuiAddress,
  CoinType,
  MistAmount,
  TokenMetadata,
  TradeRecord,
  PTBResult,
} from '@suipump/sdk'
```

## Networks

- `mainnet` — https://fullnode.mainnet.sui.io:443
- `testnet` — https://fullnode.testnet.sui.io:443
- `devnet` — https://fullnode.devnet.sui.io:443

## License

MIT
