// sdk/src/portfolio.ts - Portfolio operations

import type { ClientWithCoreApi } from '@mysten/sui/client'
import type { SuiPumpConfig } from './client.js'
import type { TradeRecord, MistAmount } from './types.js'

export interface PortfolioHolding {
  coinType: string
  tokenName: string
  tokenSymbol: string
  balance: string
  valueMist: MistAmount
  pnlPct: number
  avgBuyPriceMist: MistAmount
  currentPriceMist: MistAmount
}

export interface PortfolioSummary {
  holdings: PortfolioHolding[]
  totalValueMist: MistAmount
  totalPnlPct: number
  totalInvestedMist: MistAmount
}

interface TradePosition {
  coinType: string
  totalBoughtMist: MistAmount
  totalSoldMist: MistAmount
  totalTokens: string
  tradeCount: number
  avgBuyPrice: MistAmount
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

  async getHoldings(address: string): Promise<PortfolioHolding[]> {
    const result = await this.fetch<{ holdings: PortfolioHolding[] }>(
      `/portfolio/${address}/holdings`
    )
    return result.holdings
  }

  async getTrades(address: string, params?: { coinType?: string; limit?: number; cursor?: string }): Promise<{
    trades: TradeRecord[]
    nextCursor?: string
  }> {
    const query = new URLSearchParams()
    if (params?.coinType) query.set('coin_type', params.coinType)
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.cursor) query.set('cursor', params.cursor)

    const queryString = query.toString()
    return this.fetch<{ trades: TradeRecord[]; nextCursor?: string }>(
      `/portfolio/${address}/trades${queryString ? `?${queryString}` : ''}`
    )
  }

  async getPnL(address: string): Promise<PortfolioSummary> {
    return this.fetch<PortfolioSummary>(`/portfolio/${address}/pnl`)
  }
}