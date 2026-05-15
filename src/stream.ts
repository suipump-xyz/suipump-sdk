import type { TokenMetadata, TradeEvent, ChatMessage, KothData, ReputationData, CoinType } from './types.js'

export type WSEvent =
  | { event: 'new_token'; data: TokenMetadata; ts: number }
  | { event: 'trade'; data: TradeEvent; ts: number }
  | { event: 'graduated'; data: { coinType: CoinType }; ts: number }
  | { event: 'chat_message'; data: ChatMessage; ts: number }
  | { event: 'koth_update'; data: KothData; ts: number }
  | { event: 'reputation_update'; data: ReputationData; ts: number }

export type StreamEvent = WSEvent

export type NewTokenEvent = Extract<StreamEvent, { event: 'new_token' }>
export type TradeStreamEvent = Extract<StreamEvent, { event: 'trade' }>
export type GraduationEvent = Extract<StreamEvent, { event: 'graduated' }>
export type ChatMessageEvent = Extract<StreamEvent, { event: 'chat_message' }>
export type KothUpdateEvent = Extract<StreamEvent, { event: 'koth_update' }>
export type ReputationUpdateEvent = Extract<StreamEvent, { event: 'reputation_update' }>

type GenericHandler = (event: StreamEvent) => void

interface HandlerEntry {
  event: string
  handler: GenericHandler
}

export class StreamClient {
  private ws: WebSocket | null = null
  private handlers: HandlerEntry[] = []
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  constructor(private url: string) {}

  private ensureConnection(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return

    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as StreamEvent
        for (const entry of this.handlers) {
          if (entry.event === data.event) {
            entry.handler(data)
          }
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    }

    this.ws.onclose = () => {
      this.attemptReconnect()
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    setTimeout(() => {
      this.ensureConnection()
    }, this.reconnectDelay * this.reconnectAttempts)
  }

  onNewToken(handler: (event: StreamEvent & { event: 'new_token' }) => void): this {
    this.handlers.push({ event: 'new_token', handler: handler as GenericHandler })
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.ensureConnection()
    }
    return this
  }

  onTrade(handler: (event: StreamEvent & { event: 'trade' }) => void): this {
    this.handlers.push({ event: 'trade', handler: handler as GenericHandler })
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.ensureConnection()
    }
    return this
  }

  onGraduated(handler: (event: StreamEvent & { event: 'graduated' }) => void): this {
    this.handlers.push({ event: 'graduated', handler: handler as GenericHandler })
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.ensureConnection()
    }
    return this
  }

  onChatMessage(handler: (event: StreamEvent & { event: 'chat_message' }) => void): this {
    this.handlers.push({ event: 'chat_message', handler: handler as GenericHandler })
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.ensureConnection()
    }
    return this
  }

  onKothUpdate(handler: (event: StreamEvent & { event: 'koth_update' }) => void): this {
    this.handlers.push({ event: 'koth_update', handler: handler as GenericHandler })
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.ensureConnection()
    }
    return this
  }

  onReputationUpdate(handler: (event: StreamEvent & { event: 'reputation_update' }) => void): this {
    this.handlers.push({ event: 'reputation_update', handler: handler as GenericHandler })
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.ensureConnection()
    }
    return this
  }

  offNewToken(handler: (event: StreamEvent & { event: 'new_token' }) => void): this {
    this.handlers = this.handlers.filter(
      (h) => !(h.event === 'new_token' && h.handler === handler)
    )
    this.disconnectIfNoHandlers()
    return this
  }

  offTrade(handler: (event: StreamEvent & { event: 'trade' }) => void): this {
    this.handlers = this.handlers.filter(
      (h) => !(h.event === 'trade' && h.handler === handler)
    )
    this.disconnectIfNoHandlers()
    return this
  }

  offGraduated(handler: (event: StreamEvent & { event: 'graduated' }) => void): this {
    this.handlers = this.handlers.filter(
      (h) => !(h.event === 'graduated' && h.handler === handler)
    )
    this.disconnectIfNoHandlers()
    return this
  }

  offChatMessage(handler: (event: StreamEvent & { event: 'chat_message' }) => void): this {
    this.handlers = this.handlers.filter(
      (h) => !(h.event === 'chat_message' && h.handler === handler)
    )
    this.disconnectIfNoHandlers()
    return this
  }

  offKothUpdate(handler: (event: StreamEvent & { event: 'koth_update' }) => void): this {
    this.handlers = this.handlers.filter(
      (h) => !(h.event === 'koth_update' && h.handler === handler)
    )
    this.disconnectIfNoHandlers()
    return this
  }

  offReputationUpdate(handler: (event: StreamEvent & { event: 'reputation_update' }) => void): this {
    this.handlers = this.handlers.filter(
      (h) => !(h.event === 'reputation_update' && h.handler === handler)
    )
    this.disconnectIfNoHandlers()
    return this
  }

  private disconnectIfNoHandlers(): void {
    if (this.handlers.length === 0 && this.ws) {
      this.disconnect()
    }
  }

  connect(): this {
    this.ensureConnection()
    return this
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.handlers = []
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
