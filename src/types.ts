// sdk/src/types.ts - Shared types for SuiPump SDK
export interface PTBResult {
  /** Base64-encoded unsigned Transaction. Sign and submit with your wallet. */
  ptbBytes: string
  /** Estimated gas cost in SUI (informational only) */
  estimatedGasSui: string
  /** Expected primary output amount as string (avoids JS precision loss) */
  expectedOut: string
  /** Price impact as percentage (0-100) */
  priceImpactPct: number
}

export type SuiAddress = string
export type CoinType = string
export type MistAmount = string

export interface TokenMetadata {
  coinType: CoinType
  curveObjectId: SuiAddress
  name: string
  symbol: string
  description: string
  creatorAddress: SuiAddress
  creatorSuiName?: string
  walrusBlobId?: string
  twitter?: string
  telegram?: string
  website?: string
  realSuiReserves: MistAmount
  realTokenReserves: MistAmount
  currentPriceMist: MistAmount
  marketCapSui: string
  totalVolumeSui: string
  totalTrades: number
  holderCount: number
  curveProgress: number
  graduated: boolean
  cetusPoolId?: SuiAddress
  deepbookPoolId?: SuiAddress
  createdAt: string
  graduatedAt?: string
}

export interface TradeRecord {
  txHash: string
  tokenId: string
  coinType: CoinType
  trader: SuiAddress
  tradeType: 'buy' | 'sell'
  suiAmount: MistAmount
  tokenAmount: string
  priceMist: MistAmount
  timestamp: string
}
