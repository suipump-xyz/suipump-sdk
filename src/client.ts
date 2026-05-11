// sdk/src/client.ts - Main SuiPump class
// SDK wraps SuiGrpcClient Core API for transport-agnosticism

import type { ClientWithCoreApi } from '@mysten/sui/client'
import { TokensClient } from './tokens.js'
import { PortfolioClient } from './portfolio.js'
import { AgentClient } from './agent.js'
import { StreamClient } from './stream.js'
import { MediaClient } from './media.js'

export interface SuiPumpConfig {
  apiKey: string
  /** Any client implementing ClientWithCoreApi (SuiGrpcClient, SuiGraphQLClient, SuiJsonRpcClient) */
  client: ClientWithCoreApi
  network?: 'devnet' | 'testnet' | 'mainnet'
  apiBaseUrl?: string
  wsUrl?: string
}

export class SuiPump {
  readonly config: Required<SuiPumpConfig>
  readonly tokens: TokensClient
  readonly portfolio: PortfolioClient
  readonly agent: AgentClient
  readonly stream: StreamClient
  readonly media: MediaClient

  constructor(config: SuiPumpConfig) {
    const network = config.network ?? 'mainnet'
    this.config = {
      ...config,
      network,
      apiBaseUrl: config.apiBaseUrl ?? `https://api.${network}.suipump.xyz/v1`,
      wsUrl: config.wsUrl ?? `wss://stream.${network}.suipump.xyz/v1`,
    }

    this.tokens = new TokensClient(config.client, this.config)
    this.portfolio = new PortfolioClient(config.client, this.config)
    this.agent = new AgentClient(config.client, this.config)
    this.stream = new StreamClient(this.config.wsUrl)
    this.media = new MediaClient(this.config)
  }
}
