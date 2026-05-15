# ARCHITECTURE.md — SuiPump System Design Reference
# ====================================================
# Read this before touching any module.
# Update this whenever structure or decisions change.
# ====================================================
# PRODUCT SOURCE OF TRUTH: docs/VISION.md
# All features in this architecture derive from the 5-stage token lifecycle
# and 5 user personas described in VISION.md.
# ====================================================

```
┌──────────────────────────────────────────────────────────────┐
│  LAYER 3: FRONTEND (Next.js 14)                              │
│  dApp Kit React | Enoki zkLogin | SuiNS | Walrus | Lightweight Charts │
│  Discovery · Create · Trade · Portfolio · Gated Content      │
└──────────────────────────────┬───────────────────────────────┘
                               │ REST + WebSocket
┌──────────────────────────────▼───────────────────────────────┐
│  LAYER 2: BACKEND (Node.js / TypeScript)                     │
│  SuiGrpcClient + $extend | Walrus HTTP API | Enoki Gas Sponsorship │
│  API · Indexer · PTB Builder · WS Stream · Grad Watcher      │
└──────────────────────────────┬───────────────────────────────┘
                               │ @mysten/sui (transport-agnostic Core API)
┌──────────────────────────────▼───────────────────────────────┐
│  LAYER 1: BLOCKCHAIN (Move on SUI)                           │
│  Cetus CLMM via MVR registry | Bonding Curve AMM             │
│  factory · bonding_curve · trading · graduation              │
│  creator_vault · treasury · events                           │
└──────────────────────────────────────────────────────────────┘
```

### MCP Usage — Compulsory for All On-Chain Operations

| Environment | Requirement | Tools |
|-------------|-------------|-------|
| **Production** | MANDATORY | `sui-mcp` for on-chain ops, `sui-docs` for decision validation |
| **Development** | REQUIRED | `sui-docs` for documentation, `sui-mcp` for testnet verification |

**Always verify with MCP before and after any on-chain action:**
- Before: check balance, verify shared object state
- After: confirm gas consumed, verify object created correctly
- Before any contract deploy: faucet if needed, verify gas > 1 SUI

### Sui-Native Architecture Audit (Grade: A+)

All 13 Move modules follow Sui best practices:

| Pattern | Implementation | Grade |
|---------|---------------|-------|
| One object per module | `BondingCurve`, `CreatorVault`, `PlatformTreasury`, `TokenRegistry` each in own .move | ✅ A |
| `key` ability on all state objects | All structs have `key` (or `key, store`) | ✅ A |
| `UID` for all mutable objects | Every struct starts with `id: UID` | ✅ A |
| Capability-based auth | `TreasuryOwnerCap` protects `withdraw`/`transfer_ownership` | ✅ A |
| Pure functions for composability | `calculate_tokens_out`, `calculate_sui_out`, `spot_price_mist` — no side effects | ✅ A |
| Rich events on every state change | All 6 events in dedicated `events.move` with comprehensive fields | ✅ A |
| Coin by value | `payment: Coin<SUI>`, `tokens: Coin<T>` passed by value | ✅ A |
| TreasuryCap internal | `TreasuryCap<T>` stored inside BondingCurve — mint/burn flow through here | ✅ A |
| Separate create/share | `bonding_curve::create` returns `ID`, shares internally | ✅ A |
| u128 math intermediates | All pricing math in u128, cast back to u64 | ✅ A |
| Move.lock committed | `.gitignore` does NOT exclude `Move.lock` | ✅ A |

### SDK Ecosystem (all v2.0+ `$extend()` pattern)

| Package | Version | Layer | Purpose |
|---------|---------|-------|---------|
| `@mysten/sui` | ^2.8.0 | All | **Core SDK** — gRPC client (preferred), GraphQL, transactions (ESM-only) |
| `@mysten/dapp-kit-react` | ^2.0.0 | Frontend | Wallet connect, `ConnectButton`, `useCurrentAccount` |
| `@mysten/walrus` | ^1.1.0 | Backend/Frontend | Decentralized blob storage via `$extend(walrus())` |
| `@mysten/suins` | ^1.0.2 | Frontend/Backend | Name resolution via `$extend(suins())` |
| `@mysten/enoki` | ^1.0.7 | Backend/Frontend | zkLogin + gas sponsorship |
| `@mysten/seal` | ^1.1.1 | Frontend | Threshold encryption for gated content |
| `@mysten/deepbook-v3` | ^1.2.1 | Backend | CLOB order book — **post-mainnet future enhancement** |
| `@mysten/kiosk` | ^1.1.2 | Frontend | NFT marketplace (JSON-RPC only — not gRPC) |
| `@mysten/zksend` | ^1.0.3 | Backend | Shareable claim links via `$extend(zksend())` |
| `@cetusprotocol/sui-clmm-sdk` | ^1.4.3 | Backend | Cetus CLMM pool creation at graduation |

### Client Pattern (CRITICAL — used by all TypeScript layers)
```typescript
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { walrus } from '@mysten/walrus';
import { suins } from '@mysten/suins';

const client = new SuiGrpcClient({
  network: 'mainnet',
  baseUrl: 'https://fullnode.mainnet.sui.io:443',
}).$extend(walrus()).$extend(suins());

// Core API (transport-agnostic — works with any client):
await client.core.getObject({ objectId });
await client.core.executeTransaction({ transaction, signatures });

// Extended APIs:
await client.walrus.writeBlob({ data, epochs: 1 });
await client.suins.getNameRecord('name.sui');
```

### External integrations:
- **Cetus Protocol** — CLMM pool creation at graduation (MVR registry + TS SDK)
- **DeepBook V3** — optional CLOB listing at graduation (post-mainnet future enhancement)
- **Walrus** — decentralized media blob storage
- **Seal** — on-chain gated content access control
- **SuiNS** — human-readable creator identity (@handle.sui)
- **Enoki** — zkLogin + gas sponsorship API (Mysten Labs)
- **sui-gas-station** — self-hosted gas sponsorship (zero-deps alternative to Enoki)
- **PostgreSQL** — primary database
- **Redis** — price cache + WebSocket pub/sub + rate limiting

---

## 2. SMART CONTRACT LAYER

### 2.1 Object Model

```
BondingCurve<T> (shared object, one per token)
├── id: UID
├── virtual_sui_reserves: u64    (MIST, dynamic — $480 USD converted at current SUI price)
├── virtual_token_reserves: u64  (raw units, set at init: 1_073_000_191_000_000_000)
├── real_sui_reserves: u64       (MIST, accumulates with buys)
├── real_token_reserves: u64     (raw units, decreases with buys)
├── graduation_threshold: u64    (MIST, dynamic — $65,000 USD converted at current SUI price)
├── total_supply: u64            (1_000_000_000_000_000_000 = 1B × 10^9)
├── treasury_cap: TreasuryCap<T> (LOCKED HERE — mints and burns flow through here)
├── platform_fee_bps: u64        (80 = 0.80%)
├── creator_fee_bps: u64         (20 = 0.20%)
├── graduated: bool
├── creator: address
├── total_volume_sui: u64        (running total for analytics)
├── total_trades: u64
└── buy_count / sell_count: u64

PlatformTreasury (shared object, one global)
├── id: UID
├── balance: Balance<SUI>
└── owner: address

CreatorVault (shared object, one per creator address — lazy created)
├── id: UID
├── creator: address
├── balance: Balance<SUI>
└── split_config: vector<SplitEntry>  (multi-wallet fee split, max 10)

SplitEntry (not a key object, embedded in CreatorVault)
├── recipient: address
└── bps: u64  (must sum to 10000 across all entries)

ReputationScore (owned object, one per creator — lazy created)
├── id: UID
├── creator: address
├── tokens_created: u64
├── tokens_graduated: u64
├── total_volume_mist: u64
├── early_sell_flags: u64    (bitmask: bit 0 = sold >40% within 24h)
├── score: u64               (cached, recalculated on events)
└── last_updated: u64        (epoch ms)
```

### 2.2 Pricing Formula

All pricing uses constant product with virtual reserves:

```
effective_sui   = virtual_sui_reserves   + real_sui_reserves
effective_tok   = virtual_token_reserves - tokens_sold_so_far

// BUY: how many tokens for X SUI in
tokens_out = (effective_tok × sui_in) / (effective_sui + sui_in)

// SELL: how much SUI for X tokens in  
sui_out = (effective_sui × tokens_in) / (effective_tok + tokens_in)

// Net after fee (fee taken from input):
net_sui_in  = gross_sui_in  × (10000 - total_fee_bps) / 10000
net_tok_in  = gross_tok_in  × (10000 - total_fee_bps) / 10000
```

All arithmetic done in u128 intermediates to prevent overflow. Cast back to u64 for storage.

### 2.3 Entry Points

```move
// launcher.move — Token creation (2-click OTW flow)
public entry fun create_token<T: drop>(
    registry: &mut TokenRegistry,
    treasury_cap: TreasuryCap<T>,
    metadata: &CoinMetadata<T>,
    walrus_blob_id: vector<u8>,
    description: vector<u8>,
    creation_fee: Coin<SUI>,
    platform_treasury: &mut PlatformTreasury,
    clock: &Clock,
    ctx: &mut TxContext
)
// Creates: BondingCurve<T> shared object + CreatorVault
// Requires: pre-existing TreasuryCap from OTW package deploy

public entry fun create_token_for<T: drop>(
    registry: &mut TokenRegistry,
    treasury_cap: TreasuryCap<T>,
    metadata: &CoinMetadata<T>,
    walrus_blob_id: vector<u8>,
    description: vector<u8>,
    creation_fee: Coin<SUI>,
    platform_treasury: &mut PlatformTreasury,
    creator: address,                    // ← explicit creator (backend-sponsored flow)
    clock: &Clock,
    ctx: &mut TxContext
)
// Same as create_token but sets explicit creator address instead of ctx.sender()

// trading.move
public entry fun buy<T>(
    curve: &mut BondingCurve<T>, payment: Coin<SUI>,
    min_tokens_out: u64,
    treasury: &mut PlatformTreasury,
    creator_vault: &mut CreatorVault,
    ctx: &mut TxContext
)

public entry fun sell<T>(
    curve: &mut BondingCurve<T>, tokens: Coin<T>,
    min_sui_out: u64,
    treasury: &mut PlatformTreasury,
    creator_vault: &mut CreatorVault,
    ctx: &mut TxContext
)

// graduation.move — ATM placeholder, will be rewritten with Cetus integration
public entry fun graduate<T>(
    curve: &mut BondingCurve<T>,
    clock: &Clock,
    ctx: &mut TxContext
)

// creator_vault.move
public entry fun claim_fees(vault: &mut CreatorVault, ctx: &mut TxContext)
public entry fun set_split_config(vault: &mut CreatorVault, splits: vector<SplitEntry>, ctx: &mut TxContext)
```

### 2.4 Events

Every state change emits an event. The indexer subscribes to all of them.

```move
// events.move
struct TokenCreated has copy, drop {
    curve_id: ID, coin_type: String, creator: address,
    name: String, symbol: String, walrus_blob_id: String, ts: u64
}
struct TokenBought has copy, drop {
    curve_id: ID, buyer: address, sui_in: u64,
    tokens_out: u64, new_price: u64, new_real_reserves: u64, ts: u64
}
struct TokenSold has copy, drop {
    curve_id: ID, seller: address, tokens_in: u64,
    sui_out_mist: u64,   // gross (pre-fee) — same semantics as TokenBought.sui_in
    platform_fee_mist: u64, creator_fee_mist: u64,
    new_price_mist: u64, new_real_reserves: u64, curve_progress_bps: u64, ts: u64
}
struct TokenGraduated has copy, drop {
    curve_id: ID, coin_type: String, cetus_pool_id: ID,
    deepbook_pool_id: Option<ID>,
    final_reserves_mist: u64, ts: u64
}
struct LiquidityLocked has copy, drop {
    curve_id: ID, coin_type: String, pool_id: ID,
    lp_burn_tx_hash: vector<u8>, lp_amount: u64, ts: u64
}
struct ReputationUpdated has copy, drop {
    creator: address, new_score: u64, tokens_created: u64,
    tokens_graduated: u64, early_sell_flags: u64, ts: u64
}
```

---

## 3. BACKEND LAYER

### 3.1 Service Map

```
src/
├── index.ts              → starts API server + WS server + all background services
├── api/
│   ├── router.ts         → mounts all route groups
│   ├── middleware/
│   │   ├── auth.ts       → API key validation + rate limiting
│   │   ├── validate.ts   → Zod schema validation for all request bodies
│   │   └── errors.ts     → central error handler
│   └── routes/
│       ├── tokens.ts     → GET /tokens, GET /tokens/:id, POST /tokens/create
│       ├── trading.ts    → POST /tokens/:id/buy, /sell, GET /tokens/:id/trades
│       ├── portfolio.ts  → GET /portfolio/:address, /trades, /gated-content
│       ├── agent.ts      → POST /agent/batch-buy, /copy-subscribe
│       ├── media.ts      → POST /media/upload, GET /media/:blobId
│       └── creators.ts   → GET /creators/:suinsName
├── indexer/
│   ├── indexer.ts        → SUI event subscription loop (reconnects on drop)
│   ├── processors/
│   │   ├── token-created.ts
│   │   ├── token-bought.ts
│   │   ├── token-sold.ts
│   │   └── token-graduated.ts
│   └── cursor.ts         → persists last processed checkpoint to Redis
├── stream/
│   ├── server.ts         → WebSocket server setup
│   ├── channels.ts       → channel subscription management
│   └── publisher.ts      → Redis pub/sub → WS fan-out
├── ptb/
│   ├── buy.ts            → buildBuyPTB(coinType, suiAmount, minOut, buyer)
│   ├── sell.ts           → buildSellPTB(coinType, tokenAmount, minSuiOut, seller)
│   ├── create.ts         → buildCreateTokenPTB(params)  — no TreasuryCap inputs
│   ├── publish-otw.ts    → buildPublishOTWPTB(bytecode) — NEW: builds OTW package publish
│   ├── batch-buy.ts      → buildBatchBuyPTB(buys[], buyer)  ← agent key feature
│   └── graduate.ts       → buildGraduatePTB(coinType)
├── graduation/
│   └── watcher.ts        → polls curves approaching threshold, auto-submits grad tx
├── sponsor/
│   └── enoki.ts          → Enoki API wrapper for gas sponsorship
├── db/
│   ├── client.ts         → postgres connection pool
│   ├── tokens.ts         → token CRUD queries
│   ├── trades.ts         → trade insert + query
│   ├── holders.ts        → holder balance tracking
│   └── cursors.ts        → indexer cursor persistence
└── lib/
    ├── sui-client.ts     → SuiClient singleton + retry wrapper
    ├── config.ts         → validated env var loading (fails fast if missing)
    ├── logger.ts         → structured JSON logger (pino)
    ├── prices.ts         → price calculation from on-chain reserves
    └── suins.ts          → SuiNS name resolution cache
```

### 3.2 PTB Builder Contract

PTB builders are pure functions — they take parameters and return a serialized `Transaction`. They never sign. They never have side effects.

```typescript
// All PTB builders return this shape
interface PTBResult {
  ptbBytes: string        // base64 encoded Transaction bytes
  estimatedGasSui: string // string to avoid precision loss
  expectedOut: string     // expected primary output amount (avoids JS precision loss)
  priceImpactPct: number  // price impact as percentage (0-100)
}
```

### 3.3 Indexer Design

The indexer uses cursor-based checkpointing:
1. On start: reads last processed checkpoint from Redis
2. Subscribes to SUI event stream filtered by package ID
3. For each event batch: processes sequentially, writes to DB in a transaction, updates cursor
4. On disconnect: waits 2s, reconnects, resumes from last cursor
5. Never processes the same event twice (idempotent by tx_hash + event_seq)

### 3.4 Graduation Watcher

Runs every 30 seconds:
1. Queries DB for `graduated = false AND curve_progress > 0.95`
2. Fetches actual on-chain `real_sui_reserves` from RPC for each
3. If `real_sui_reserves >= graduation_threshold`: builds graduation PTB, signs with platform hot wallet, submits
4. Platform hot wallet private key loaded from env (never logged)
5. After graduation: Cetus pool ID indexed from transaction effects

---

## 4. FRONTEND LAYER

### 4.0 VISION.md Stage Mapping

| VISION Stage | Frontend Pages | Status |
|-------------|----------------|--------|
| Stage 1: Discovery | `/` (discovery), `/graduated` | ✅ Built (King of the Hill, MarketOverview, Leaderboards) |
| Stage 2: Creation | `/create` | ✅ Built (2-click OTW, zkLogin Google sign-in, Enoki sponsorship) |
| Stage 3: Bonding Curve | `/token/[coinType]` | ✅ Built (Seal-gated chat, gated content, candlestick chart, analytics, reputation) |
| Stage 4: Graduation | GraduationAnimation on `/token/[coinType]` | ✅ Built (confetti animation, LP burn badge, Cetus pool link, graduation watcher, Telegram announcements) |
| Stage 5: Post-Grad | `/graduated`, post-mainnet DeepBook (future) | ✅ Built (LP burn verification, Cetus pool display, DeepBook post-mainnet) |

### 4.1 Page Map

```
app/
├── page.tsx                     → / discovery feed (KothBanner, MarketOverview, filterable grid)
├── create/page.tsx              → /create token creation form (zkLogin onboarding, 2-step OTW)
├── token/[coinType]/page.tsx    → /token/:id full token page (chart, buy/sell, analytics, chat, GraduationAnimation)
├── portfolio/[address]/page.tsx → /portfolio/:address holdings + trade history (responsive tables)
├── profile/[suinsName]/page.tsx → /profile/:suinsName creator profile (reputation, created tokens)
└── graduated/page.tsx           → /graduated post-graduation tokens (LP burn badges, Cetus pool links)

components/
├── GraduationAnimation.tsx      → 3-state machine (idle → graduating → graduated) w/ confetti
├── BondingCurveBar.tsx          → progress bar with nearGraduation prop (pulse + yellow gradient)
├── KothBanner.tsx               → King of the Hill featured slot
├── LpBurnBadge.tsx              → LP burn verification (verified/unverified/loading states)
├── ReputationBadge.tsx          → 6-tier creator reputation display
├── HolderChat.tsx               → token-gated chat (Seal threshold encryption)
├── GatedContent.tsx             → gated content display with blurred preview
├── MarketOverview.tsx           → 4-card market stats dashboard
├── AnalyticsCard.tsx            → label/value/trend card for analytics
├── LeaderboardTable.tsx         → ranked leaderboard (tokens/creators/traders)
├── TokenAnalyticsSection.tsx    → per-token analytics cards
└── ConnectWallet.tsx            → wallet connect + Google sign-in (zkLogin)
```

### 4.2 State Management

- **Server state:** TanStack Query (React Query) for all API data
- **Wallet state:** @mysten/dapp-kit `useCurrentAccount`, `useSignAndExecuteTransaction`
- **UI state:** React `useState` / `useReducer` — no global store needed
- **Real-time:** native WebSocket connection managed in a custom hook `useStream`

### 4.3 Wallet Integration

```typescript
// zkLogin (Enoki) — Google/Apple sign in
import { useEnokiFlow } from '@mysten/enoki/react'

// Standard wallet — Slush, Suiet, Martian
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit'
```

### 4.4 Trade Flow (client-side)

```
1. User inputs SUI amount
2. Frontend calls GET /tokens/:id for current reserves
3. Frontend calculates expected output locally (same formula as contract)
4. User clicks BUY
5. Frontend calls POST /tokens/:id/buy → gets ptb_bytes
6. @mysten/dapp-kit signs and submits ptb_bytes to SUI network
7. Frontend polls tx status every 500ms until finalized
8. On success: invalidate TanStack Query cache for this token
9. New trade appears in WS feed within ~500ms
```

---

## 5. DATABASE SCHEMA

```sql
-- tokens table
CREATE TABLE tokens (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coin_type        TEXT NOT NULL UNIQUE,   -- 0xPKG::module::TYPE
  curve_object_id  TEXT NOT NULL UNIQUE,   -- SUI shared object ID
  name             TEXT NOT NULL,
  symbol           TEXT NOT NULL,
  description      TEXT,
  creator_address  TEXT NOT NULL,
  creator_sui_name TEXT,                   -- cached @name.sui
  walrus_blob_id   TEXT,                   -- image/media
  twitter          TEXT,
  telegram         TEXT,
  website          TEXT,
  -- pricing (updated by indexer on every trade)
  real_sui_reserves    NUMERIC(30,0) DEFAULT 0,
  real_token_reserves  NUMERIC(38,0) DEFAULT 0,
  current_price_mist   NUMERIC(30,0) DEFAULT 0,
  market_cap_sui       NUMERIC(20,6) DEFAULT 0,
  -- stats
  total_volume_sui     NUMERIC(20,6) DEFAULT 0,
  total_trades         INTEGER DEFAULT 0,
  holder_count         INTEGER DEFAULT 0,
  -- state
  graduated        BOOLEAN NOT NULL DEFAULT false,
  cetus_pool_id    TEXT,
  deepbook_pool_id TEXT,
  graduated_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tokens_creator ON tokens(creator_address);
CREATE INDEX idx_tokens_graduated ON tokens(graduated);
CREATE INDEX idx_tokens_volume ON tokens(total_volume_sui DESC);

-- trades table
CREATE TABLE trades (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash         TEXT NOT NULL,
  event_seq       INTEGER NOT NULL,
  token_id        UUID REFERENCES tokens(id),
  coin_type       TEXT NOT NULL,
  trader          TEXT NOT NULL,
  trade_type      TEXT NOT NULL CHECK (trade_type IN ('buy','sell')),
  sui_amount      NUMERIC(30,0) NOT NULL,    -- MIST
  token_amount    NUMERIC(38,0) NOT NULL,    -- raw units
  price_mist      NUMERIC(30,0) NOT NULL,    -- price at time of trade
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tx_hash, event_seq)
);
CREATE INDEX idx_trades_token ON trades(token_id, created_at DESC);
CREATE INDEX idx_trades_trader ON trades(trader, created_at DESC);

-- holders table (upserted on every trade)
CREATE TABLE holders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id     UUID REFERENCES tokens(id),
  address      TEXT NOT NULL,
  balance      NUMERIC(38,0) NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(token_id, address)
);
CREATE INDEX idx_holders_token ON holders(token_id, balance DESC);

-- api_keys table
CREATE TABLE api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash    TEXT NOT NULL UNIQUE,   -- SHA-256 of raw key
  owner       TEXT NOT NULL,          -- SUI address
  tier        TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','pro','agent')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used   TIMESTAMPTZ,
  revoked     BOOLEAN NOT NULL DEFAULT false
);

-- indexer_cursors table
CREATE TABLE indexer_cursors (
  id              TEXT PRIMARY KEY,   -- e.g. 'main'
  checkpoint_seq  BIGINT NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- copy_subscriptions table
CREATE TABLE copy_subscriptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_wallet    TEXT NOT NULL,
  subscriber       TEXT NOT NULL,
  webhook_url      TEXT NOT NULL,
  max_sui_per_trade NUMERIC(20,6),
  ratio            NUMERIC(5,4),      -- 0.0001 to 1.0000
  active           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_copy_target ON copy_subscriptions(target_wallet) WHERE active = true;
```

---

## 5.5 VISION.md Feature Coverage

Features from VISION.md that are fully implemented:
- Bonding curve trading (trading.move + buy/sell PTB)
- Event-driven indexer (6 event types)
- WebSocket feed (4 channel types)
- Unsigned PTB architecture (zero-trust for bot builders)
- SuiNS name resolution
- Walrus media storage
- Batch-buy PTB (atomic multi-token)
- Copy-trade subscriptions
- Creator vault (multi-wallet fee splits)
- Graduation watcher (auto-trigger with Cetus integration)
- Gas sponsorship (Enoki + sui-gas-station)
- 2-click OTW creation flow (backend OTW engine + launcher.create_token_for)
- Creator reputation on-chain (reputation.move + factory.CreatorMetrics)
- Enhanced events (LiquidityLocked, ReputationUpdated)
- Seal-gated holder chat (threshold encryption via @mysten/seal)
- zkLogin / Google sign-in (Enoki flow + auth callback)
- Cetus CLMM real pool creation at graduation (graduation.move + cetus SDK)
- LP burn verification display (LpBurnBadge component + API)
- King of the Hill slot on discovery page (KothBanner + useKoth hook)
- Mobile-optimized layout (responsive breakpoints, overflow-x-auto tables)
- Telegram bot (grammy-based with whale alerts, new token feed, graduation announcements)
- Analytics / leaderboards (MarketOverview, TokenAnalyticsSection, LeaderboardTable)
- API key tiers with rate limiting (3 tiers: Free/Pro/Agent)
- Price impact display in BuyWidget/SellWidget (warning banner + color-coding)
- Candlestick chart (lightweight-charts addCandlestickSeries)
- One-click max buy/sell buttons
- Graduation animation (confetti, pulsing banner, state machine)
- Wallet-less onboarding (Enoki zkLogin)

Features remaining:
- DeepBook CLOB pool creation (Phase 5 — post-mainnet)

---
## 6. EXTERNAL INTEGRATION DETAILS

### Cetus (pool creation at graduation)
- Move dep: use MVR registry — `CetusClmm = { registry = "@cetuspackages/clmm" }` in `Move.toml`
- TypeScript SDK: `@cetusprotocol/sui-clmm-sdk` **^1.4.3** (NOT ^5.4.0 which no longer resolves on npm)
- Build contracts with `--default-move-edition 2024.beta` flag
- Use `CetusClmmSDK.createSDK({ env })` to init
- Pool type: `SUI / TOKEN`, full-range initial position
- Tick spacing: 60 (for volatile pairs)
- Initial sqrt price: calculated from final bonding curve reserves
- LP NFT burned immediately using `destroy` after creation
- Uses `@mysten/sui` (not `@mysten/sui.js`) as peer dependency
- Docs: `https://cetus-1.gitbook.io/cetus-developer-docs`

### DeepBook V3 (Post-Mainnet Future Enhancement)
- Package: `@mysten/deepbook-v3` ^1.2.1 (client extension pattern)
- Use via `client.$extend(deepbook())`
- Pool creation is optional — triggered by creator setting a flag
- Market: `SUI / TOKEN`
- Initial tick size: 1000 MIST (0.000001 SUI)
- Lot size: 1_000_000_000 token units
- **Not part of pre-mainnet graduation pipeline** — Cetus CLMM is the sole graduation target

### Walrus
- SDK: `@mysten/walrus` ^1.1.0 (client extension: `client.$extend(walrus())`)
- OR simple HTTP API (preferred for backend):
  - Publisher (upload): PUT `{publisher}/v1/blobs` with body/file
  - Aggregator (read): GET `{aggregator}/v1/{blobId}`
- Testnet endpoints:
  - Publisher: `https://publisher.walrus-testnet.walrus.space`
  - Aggregator: `https://aggregator.walrus-testnet.walrus.space`
- Store blob ID in DB (not full URL)
- Upload relay for browser: `https://upload-relay.testnet.walrus.space`
- Tip config: GET `{relay}/v1/tip-config`

### Seal (gated content)
- SDK: `@mysten/seal` ^1.1.1 (client extension: `client.$extend(seal({ serverConfigs }))`)
- Encryption happens client-side in browser
- Access policy defined as a Move module condition (hold ≥ N tokens)
- Uses threshold encryption (t-of-n key servers)
- Key servers configured per app; fixed set recommended for simplicity
- Docs: `https://seal-docs.wal.app/`

### SuiNS
- SDK: `@mysten/suins` ^1.0.2 (client extension: `client.$extend(suins())`)
- Simple name resolution already built into RPC (`resolveNameService`)
- Use SDK for advanced: `getNameRecord`, `getPriceList`, subnames, transactions
- Cache resolved names in Redis: key `suins:{address}`, TTL 3600s
- Reverse lookup: address → name
- Forward lookup: name → address
- Mainnet packages known (Core V3: `0x00c2f85e...`, Subnames, Registration, Renewal)
- Docs: `https://docs.suins.io/developer/integration`

### Enoki (zkLogin + gas sponsorship)
- SDK: `@mysten/enoki` **^1.0.7** (NOT ^0.1.x which does not exist)
- Uses `registerEnokiWallets()` for wallet-standard + dApp Kit integration
- Gas sponsor flow:
  1. Backend: `EnokiClient.createSponsoredTransaction()` using private API key
  2. Frontend: user signs with Enoki ephemeral key
  3. Backend: `EnokiClient.executeSponsoredTransaction()`
- zkLogin flow: entirely frontend via `useEnokiFlow()` hook
- Requires Enoki Portal for API key configuration: `https://portal.enoki.mystenlabs.com`
- Alternative: `sui-gas-station` ^0.2.0 (self-hosted, zero runtime deps)

### zkSend (Shareable Transfer Links) — Optional
- SDK: `@mysten/zksend` ^1.0.3 (client extension: `client.$extend(zksend())`)
- Create claimable links for token distribution, airdrops
- Recipient claims via URL without needing wallet set up
- Uses ephemeral keypairs + contract-based claim mechanism

---

## 7. SECURITY CONSIDERATIONS

- **Platform hot wallet** (for graduation tx): stored in env, loaded once at startup, never logged
- **API keys**: store SHA-256 hash only, never plaintext
- **Rate limiting**: Redis-based sliding window per API key
- **Input validation**: Zod schemas on every API endpoint, reject unknown fields
- **SUI addresses**: validate regex `^0x[0-9a-f]{64}$` before any RPC call
- **Amounts**: validate > 0 and < u64::MAX before building PTBs
- **Graduation PTB**: verify on-chain state before submitting — never blindly submit
- **Webhooks (copy-trade)**: HMAC-sign all webhook payloads, document header format in SDK docs
- **CORS**: whitelist specific origins in production, open in dev
- **SQL injection**: parameterized queries only — never string concatenation in SQL
