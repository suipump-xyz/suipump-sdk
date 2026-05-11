// sdk/src/stream.ts - WebSocket stream client

export interface NewTokenEvent {
  event: 'new_token'
  coinType: string
  name: string
  symbol: string
  creator: string
  creatorSuiName?: string
  walrusBlobId?: string
  ts: number
}

export interface TradeEvent {
  event: 'trade'
  coinType: string
  tradeType: 'buy' | 'sell'
  suiAmount: string
  tokenAmount: string
  trader: string
  priceMist: string
  curveProgress: number
  ts: number
}

export interface GraduationEvent {
  event: 'graduated'
  coinType: string
  cetusPoolId: string
  deepbookPoolId?: string
  ts: number
}

export type StreamEvent = NewTokenEvent | TradeEvent | GraduationEvent

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

  onNewToken(handler: (event: NewTokenEvent) => void): this {
    this.handlers.push({ event: 'new_token', handler: handler as GenericHandler })
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.ensureConnection()
    }
    return this
  }

  onTrade(handler: (event: TradeEvent) => void): this {
    this.handlers.push({ event: 'trade', handler: handler as GenericHandler })
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.ensureConnection()
    }
    return this
  }

  onGraduated(handler: (event: GraduationEvent) => void): this {
    this.handlers.push({ event: 'graduated', handler: handler as GenericHandler })
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.ensureConnection()
    }
    return this
  }

  offNewToken(handler: (event: NewTokenEvent) => void): this {
    this.handlers = this.handlers.filter(
      (h) => !(h.event === 'new_token' && h.handler === handler)
    )
    this.disconnectIfNoHandlers()
    return this
  }

  offTrade(handler: (event: TradeEvent) => void): this {
    this.handlers = this.handlers.filter(
      (h) => !(h.event === 'trade' && h.handler === handler)
    )
    this.disconnectIfNoHandlers()
    return this
  }

  offGraduated(handler: (event: GraduationEvent) => void): this {
    this.handlers = this.handlers.filter(
      (h) => !(h.event === 'graduated' && h.handler === handler)
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