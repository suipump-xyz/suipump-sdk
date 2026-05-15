import type { ClientWithCoreApi } from '@mysten/sui/client'
import type { SuiPumpConfig } from './client.js'
import type { PTBResult } from './types.js'

export interface BatchBuyParams {
  buys: Array<{
    coinType: string
    suiAmountMist: string
    minTokensOut: string
    slippageBps?: number
  }>
  buyerAddress: string
}

export interface CopySubscribeParams {
  targetTrader: string
  subscriber: string
  maxSuiPerTrade?: string
  ratio?: number
}

export class AgentClient {
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

  async batchBuy(params: BatchBuyParams): Promise<PTBResult> {
    const { buys, buyerAddress } = params

    const formattedBuys = buys.map((buy) => ({
      coinType: buy.coinType,
      suiAmountMist: buy.suiAmountMist,
      minTokensOut: buy.minTokensOut,
      slippageBps: buy.slippageBps ?? 50,
    }))

    return this.fetch<PTBResult>('/agent/batch-buy', {
      buys: formattedBuys,
      buyerAddress,
    })
  }

  async copySubscribe(params: CopySubscribeParams): Promise<{
    subscriptionId: string
    targetTrader: string
    subscriber: string
    maxSuiPerTrade: string
    ratio: number
    status: string
    message: string
  }> {
    return this.fetch<{
      subscriptionId: string
      targetTrader: string
      subscriber: string
      maxSuiPerTrade: string
      ratio: number
      status: string
      message: string
    }>('/agent/copy-subscribe', {
      subscriber: params.subscriber,
      targetTrader: params.targetTrader,
      maxSuiPerTrade: params.maxSuiPerTrade ?? '1000000000',
      ratio: params.ratio ?? 100,
    })
  }

  async unsubscribe(subscriptionId: string): Promise<{
    subscriptionId: string
    status: string
    message: string
  }> {
    return this.fetch<{
      subscriptionId: string
      status: string
      message: string
    }>('/agent/copy-unsubscribe', { subscriptionId })
  }
}
