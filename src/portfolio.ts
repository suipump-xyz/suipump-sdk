import type { ClientWithCoreApi } from '@mysten/sui/client'
import type { SuiPumpConfig } from './client.js'
import type { TradeRecord, TokenMetadata, MistAmount, SuiAddress } from './types.js'

export interface PortfolioHolding {
  token: TokenMetadata
  balance: string
  valueSui: string
}

export interface PortfolioOverview {
  address: SuiAddress
  suiBalance: string
  portfolioValueSui: string
  holdingsCount: number
  tradesTodayCount: number
  totalTrades: number
}

export class PortfolioClient {
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

  async getHoldings(address: string): Promise<{
    address: SuiAddress
    holdings: PortfolioHolding[]
  }> {
    return this.fetch<{ address: SuiAddress; holdings: PortfolioHolding[] }>(
      `/portfolio/${address}/holdings`
    )
  }

  async getTrades(address: string, params?: { limit?: number }): Promise<{
    address: SuiAddress
    trades: TradeRecord[]
    limit: number
  }> {
    const query = new URLSearchParams()
    if (params?.limit) query.set('limit', String(params.limit))

    const queryString = query.toString()
    return this.fetch<{ address: SuiAddress; trades: TradeRecord[]; limit: number }>(
      `/portfolio/${address}/trades${queryString ? `?${queryString}` : ''}`
    )
  }

  async getOverview(address: string): Promise<PortfolioOverview> {
    return this.fetch<PortfolioOverview>(`/portfolio/${address}/overview`)
  }
}
