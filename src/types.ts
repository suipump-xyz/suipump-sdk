export interface PTBResult {
  ptbBytes: string
  estimatedGasSui: string
  expectedOut: string
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
  lpBurnTxHash?: string
  lpBurnVerified: boolean
}

export interface TradeEvent {
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

export interface ChatMessage {
  id: string
  coinType: CoinType
  sender: SuiAddress
  senderName?: string
  content: string
  timestamp: string
}

export interface GatedContent {
  blobId: string
  coinType: CoinType
  title: string
  contentType: string
  createdAt: string
}

export interface KothData {
  coinType: CoinType
  name: string
  symbol: string
  volumeSui: string
  priceMist: MistAmount
  marketCapSui: string
  holderCount: number
  lastUpdated: string
  graduated: boolean
  walrusBlobId?: string
}

export interface ReputationData {
  address: SuiAddress
  score: number
  tier: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
  tokensCreated: number
  tokensGraduated: number
  totalVolumeMist: MistAmount
  earlySellFlags: number
  lastUpdated: string
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
