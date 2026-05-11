# @suipump/sdk

TypeScript SDK for SuiPump — the token lifecycle operating system on Sui (see docs/VISION.md).

## Installation

```bash
npm install @suipump/sdk
```

## Quick Start

```typescript
import { SuiPump, SuiGrpcClient } from '@suipump/sdk'

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
const { tokens, nextCursor } = await pump.tokens.list({ limit: 20 })

// Get buy PTB (unsigned transaction)
const buyPtb = await pump.tokens.buy({
  coinType: '0x...',
  suiAmountMist: '1000000000', // 1 SUI in MIST
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

// Create new token
const { ptb, tokenMetadata } = await pump.tokens.create({
  name: 'My Token',
  symbol: 'MTK',
  description: 'My awesome token',
  iconBlobId: '...', // Optional Walrus blob ID
})
```

### Portfolio

```typescript
// Get holdings
const holdings = await pump.portfolio.getHoldings('0x...')

// Get trade history
const { trades, nextCursor } = await pump.portfolio.getTrades('0x...')

// Get PnL summary
const summary = await pump.portfolio.getPnL('0x...')
```

### Agent

```typescript
// Batch buy multiple tokens atomically
const batchPtb = await pump.agent.batchBuy({
  buys: [
    { coinType: '0x...', suiAmountMist: '1000000000' },
    { coinType: '0x...', suiAmountMist: '500000000' },
  ],
  buyerAddress: '0x...',
})

// Copy trade subscription
const subscription = await pump.agent.copySubscribe({
  targetWallet: '0x...', // Trader to follow
  subscriberAddress: '0x...', // Your wallet
  maxSuiPerTrade: '1000000000',
  ratio: 0.1, // 10% of target's trade size
})
```

### Stream (WebSocket)

```typescript
const stream = pump.stream
  .onNewToken((event) => {
    console.log('New token created:', event.name)
  })
  .onTrade((event) => {
    console.log(`Trade: ${event.tradeType} ${event.tokenAmount} tokens`)
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
// Upload image/file
const { blobId } = await pump.media.upload(fileInput.files[0])

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