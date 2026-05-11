// sdk/src/tokens.ts - Token operations

import type { ClientWithCoreApi } from '@mysten/sui/client'
import type { SuiPumpConfig } from './client.js'
import type { TokenMetadata, PTBResult } from './types.js'

export interface BuyParams {
  coinType: string
  suiAmountMist: string
  minTokensOut?: string
  buyerAddress: string
  slippageBps?: number
}

export interface SellParams {
  coinType: string
  tokenAmount: string
  minSuiOutMist?: string
  sellerAddress: string
  slippageBps?: number
}

export interface CreateTokenParams {
  name: string
  symbol: string
  description?: string
  iconBlobId?: string
  twitter?: string
  telegram?: string
  website?: string
}

export interface ListTokensParams {
  sort?: 'volume' | 'created' | 'market_cap'
  limit?: number
  cursor?: string
  graduated?: boolean
}

interface TokensConfig {
  apiBaseUrl: string
  apiKey: string
}

export class TokensClient {
  constructor(
    private client: ClientWithCoreApi,
    private config: Required<SuiPumpConfig>
  ) {}

  private get apiBaseUrl() {
    return this.config.apiBaseUrl
  }

  private get apiKey() {
    return this.config.apiKey
  }

  private async fetch<T>(path: string, body?: object): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
    }

    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      method: body ? 'POST' : 'GET',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API error: ${response.status} - ${error}`)
    }

    return response.json() as Promise<T>
  }

  async get(coinType: string): Promise<TokenMetadata> {
    return this.fetch<TokenMetadata>(`/tokens/${encodeURIComponent(coinType)}`)
  }

  async list(params?: ListTokensParams): Promise<{ tokens: TokenMetadata[]; nextCursor?: string }> {
    const query = new URLSearchParams()
    if (params?.sort) query.set('sort', params.sort)
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.cursor) query.set('cursor', params.cursor)
    if (params?.graduated !== undefined) query.set('graduated', String(params.graduated))

    const queryString = query.toString()
    return this.fetch<{ tokens: TokenMetadata[]; nextCursor?: string }>(
      `/tokens${queryString ? `?${queryString}` : ''}`
    )
  }

  async buy(params: BuyParams): Promise<PTBResult> {
    return this.fetch<PTBResult>('/tokens/buy', {
      coin_type: params.coinType,
      sui_amount_mist: params.suiAmountMist,
      min_tokens_out: params.minTokensOut,
      buyer_address: params.buyerAddress,
      slippage_bps: params.slippageBps ?? 50,
    })
  }

  async sell(params: SellParams): Promise<PTBResult> {
    return this.fetch<PTBResult>('/tokens/sell', {
      coin_type: params.coinType,
      token_amount: params.tokenAmount,
      min_sui_out_mist: params.minSuiOutMist,
      seller_address: params.sellerAddress,
      slippage_bps: params.slippageBps ?? 50,
    })
  }

  async create(params: CreateTokenParams): Promise<{ ptb: PTBResult; tokenMetadata: TokenMetadata }> {
    return this.fetch<{ ptb: PTBResult; tokenMetadata: TokenMetadata }>('/tokens/create', {
      name: params.name,
      symbol: params.symbol,
      description: params.description ?? '',
      icon_blob_id: params.iconBlobId,
      twitter: params.twitter,
      telegram: params.telegram,
      website: params.website,
    })
  }
}