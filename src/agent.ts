// sdk/src/agent.ts - Agent operations

import type { ClientWithCoreApi } from '@mysten/sui/client'
import type { SuiPumpConfig } from './client.js'
import type { PTBResult } from './types.js'

export interface BatchBuyParams {
  buys: Array<{
    coinType: string
    suiAmountMist: string
    slippageBps?: number
  }>
  buyerAddress: string
}

export interface CopySubscribeParams {
  targetWallet: string
  subscriberAddress: string
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
      coin_type: buy.coinType,
      sui_amount_mist: buy.suiAmountMist,
      slippage_bps: buy.slippageBps ?? 50,
    }))

    return this.fetch<PTBResult>('/agent/batch-buy', {
      buys: formattedBuys,
      buyer_address: buyerAddress,
    })
  }

  async copySubscribe(params: CopySubscribeParams): Promise<{
    subscriptionId: string
    targetWallet: string
    subscriberAddress: string
    maxSuiPerTrade: string
    ratio: number
    status: 'active' | 'paused'
  }> {
    return this.fetch<{
      subscriptionId: string
      targetWallet: string
      subscriberAddress: string
      maxSuiPerTrade: string
      ratio: number
      status: 'active' | 'paused'
    }>('/agent/copy-subscribe', {
      target_wallet: params.targetWallet,
      subscriber_address: params.subscriberAddress,
      max_sui_per_trade: params.maxSuiPerTrade ?? '1000000000',
      ratio: params.ratio ?? 0.1,
    })
  }

  async getSubscriptions(subscriberAddress: string): Promise<Array<{
    subscriptionId: string
    targetWallet: string
    status: 'active' | 'paused'
  }>> {
    return this.fetch<Array<{
      subscriptionId: string
      targetWallet: string
      status: 'active' | 'paused'
    }>>(`/agent/subscriptions/${subscriberAddress}`)
  }

  async unsubscribe(subscriptionId: string): Promise<{ success: boolean }> {
    return this.fetch<{ success: boolean }>(`/agent/unsubscribe/${subscriptionId}`, {})
  }
}