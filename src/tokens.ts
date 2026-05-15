import type { ClientWithCoreApi } from '@mysten/sui/client'
import type { SuiPumpConfig } from './client.js'
import type { TokenMetadata, PTBResult } from './types.js'

export interface BuyParams {
  coinType: string
  suiAmountMist: string
  minTokensOut: string
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
  creatorAddress: string
  imageBlobId?: string
  twitter?: string
  telegram?: string
  website?: string
}

export interface ListTokensParams {
  sort?: 'volume' | 'created' | 'market_cap'
  limit?: number
  offset?: number
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
    const result = await this.fetch<{ token: TokenMetadata }>(`/tokens/${encodeURIComponent(coinType)}`)
    return result.token
  }

  async list(params?: ListTokensParams): Promise<{ tokens: TokenMetadata[]; limit: number; offset: number }> {
    if (params?.graduated) {
      const query = new URLSearchParams()
      if (params?.limit) query.set('limit', String(params.limit))
      if (params?.offset !== undefined) query.set('offset', String(params.offset))
      const queryString = query.toString()
      return this.fetch<{ tokens: TokenMetadata[]; limit: number; offset: number }>(
        `/tokens/graduated${queryString ? `?${queryString}` : ''}`
      )
    }

    const query = new URLSearchParams()
    if (params?.sort) query.set('sort', params.sort)
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.offset !== undefined) query.set('offset', String(params.offset))

    const queryString = query.toString()
    return this.fetch<{ tokens: TokenMetadata[]; limit: number; offset: number }>(
      `/tokens${queryString ? `?${queryString}` : ''}`
    )
  }

  async buy(params: BuyParams): Promise<PTBResult> {
    return this.fetch<PTBResult>(`/trading/${encodeURIComponent(params.coinType)}/buy`, {
      suiAmountMist: params.suiAmountMist,
      minTokensOut: params.minTokensOut,
      buyerAddress: params.buyerAddress,
      slippageBps: params.slippageBps ?? 50,
    })
  }

  async sell(params: SellParams): Promise<PTBResult> {
    return this.fetch<PTBResult>(`/trading/${encodeURIComponent(params.coinType)}/sell`, {
      tokenAmount: params.tokenAmount,
      minSuiOutMist: params.minSuiOutMist,
      sellerAddress: params.sellerAddress,
      slippageBps: params.slippageBps ?? 50,
    })
  }

  async getCreationInfo(): Promise<{
    creationFeeSui: string
    creationFeeMist: string
    endpoints: { preparePublish: string; confirmCreate: string }
    note: string
  }> {
    return this.fetch<{
      creationFeeSui: string
      creationFeeMist: string
      endpoints: { preparePublish: string; confirmCreate: string }
      note: string
    }>('/tokens/create', {
      name: '',
      symbol: '',
      creatorAddress: '',
    })
  }

  async preparePublish(params: CreateTokenParams): Promise<{
    publishTxBytes: string
    metadataBlobId: string
    creationFeeMist: string
    estimatedGasSui: string
    steps: string[]
    otwModuleName: string
    otwName: string
  }> {
    return this.fetch<{
      publishTxBytes: string
      metadataBlobId: string
      creationFeeMist: string
      estimatedGasSui: string
      steps: string[]
      otwModuleName: string
      otwName: string
    }>('/tokens/prepare-publish', {
      name: params.name,
      symbol: params.symbol,
      description: params.description ?? '',
      creatorAddress: params.creatorAddress,
      imageBlobId: params.imageBlobId,
    })
  }

  async confirmCreate(params: CreateTokenParams & {
    publishedPackageId: string
    treasuryCapObjectId: string
    coinMetadataObjectId: string
  }): Promise<{
    token: TokenMetadata
    creationTxHash: string
  }> {
    return this.fetch<{
      token: TokenMetadata
      creationTxHash: string
    }>('/tokens/confirm-create', {
      name: params.name,
      symbol: params.symbol,
      description: params.description ?? '',
      creatorAddress: params.creatorAddress,
      publishedPackageId: params.publishedPackageId,
      treasuryCapObjectId: params.treasuryCapObjectId,
      coinMetadataObjectId: params.coinMetadataObjectId,
      imageBlobId: params.imageBlobId,
    })
  }

  async create(params: CreateTokenParams): Promise<{
    creationFeeSui: string
    creationFeeMist: string
    endpoints: { preparePublish: string; confirmCreate: string }
    note: string
  }> {
    return this.fetch<{
      creationFeeSui: string
      creationFeeMist: string
      endpoints: { preparePublish: string; confirmCreate: string }
      note: string
    }>('/tokens/create', {
      name: params.name,
      symbol: params.symbol,
      description: params.description ?? '',
      creatorAddress: params.creatorAddress,
      twitter: params.twitter,
      telegram: params.telegram,
      website: params.website,
      imageBlobId: params.imageBlobId,
    })
  }
}
