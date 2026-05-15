import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { StreamClient } from '../src/stream.js'

class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  url: string
  readyState: number = MockWebSocket.CONNECTING
  onopen: ((event: any) => void) | null = null
  onmessage: ((event: any) => void) | null = null
  onclose: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null

  constructor(url: string) {
    this.url = url
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      if (this.onopen) this.onopen({ type: 'open' })
    }, 0)
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) this.onclose({ type: 'close', code: 1000, reason: '', wasClean: true })
    this.onopen = null
    this.onmessage = null
    this.onclose = null
    this.onerror = null
  }

  _receive(data: string): void {
    if (this.onmessage) {
      this.onmessage({ data })
    }
  }
}

function createClient(wsUrl?: string) {
  return new StreamClient(wsUrl ?? 'wss://stream.testnet.suipump.xyz/v1')
}

describe('StreamClient', () => {
  let consoleSpy: any

  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket as any)
    vi.useFakeTimers()
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
    consoleSpy.mockRestore()
  })

  describe('onNewToken()', () => {
    it('should register handler and connect', () => {
      const client = createClient()
      const handler = vi.fn()
      client.onNewToken(handler)
      expect(client.isConnected()).toBe(false)
      vi.advanceTimersToNextTimer()
      expect(client.isConnected()).toBe(true)
    })

    it('should not reconnect if already connected', () => {
      const client = createClient()
      const handler = vi.fn()
      client.onNewToken(handler)
      vi.advanceTimersToNextTimer()
      expect(client.isConnected()).toBe(true)
      const handler2 = vi.fn()
      client.onNewToken(handler2)
      expect(client.isConnected()).toBe(true)
    })

    it('should route new_token events to registered handler', () => {
      const client = createClient()
      const handler = vi.fn()
      client.onNewToken(handler)
      vi.advanceTimersToNextTimer()

      const ws = (client as any).ws as MockWebSocket
      ws._receive(JSON.stringify({
        event: 'new_token',
        coinType: '0xabc::coin::COIN',
        name: 'Test',
        symbol: 'TEST',
        creator: '0xcreator',
        ts: 1234567890,
      }))

      expect(handler).toHaveBeenCalledTimes(1)
      const event = handler.mock.calls[0][0]
      expect(event.event).toBe('new_token')
      expect(event.coinType).toBe('0xabc::coin::COIN')
    })

    it('should not call handler for different event type', () => {
      const client = createClient()
      const handler = vi.fn()
      client.onNewToken(handler)
      vi.advanceTimersToNextTimer()

      const ws = (client as any).ws as MockWebSocket
      ws._receive(JSON.stringify({
        event: 'trade',
        coinType: '0xabc::coin::COIN',
        tradeType: 'buy',
        suiAmount: '1000',
        tokenAmount: '500',
        trader: '0xtrader',
        priceMist: '2',
        curveProgress: 10,
        ts: 1234567890,
      }))

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('onTrade()', () => {
    it('should register trade handler and connect', () => {
      const client = createClient()
      const handler = vi.fn()
      client.onTrade(handler)
      vi.advanceTimersToNextTimer()
      expect(client.isConnected()).toBe(true)
    })

    it('should route trade events to handler', () => {
      const client = createClient()
      const handler = vi.fn()
      client.onTrade(handler)
      vi.advanceTimersToNextTimer()

      const ws = (client as any).ws as MockWebSocket
      ws._receive(JSON.stringify({
        event: 'trade',
        coinType: '0xabc::coin::COIN',
        tradeType: 'sell',
        suiAmount: '500000',
        tokenAmount: '2500',
        trader: '0xseller',
        priceMist: '200',
        curveProgress: 25,
        ts: 1234567890,
      }))

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].event).toBe('trade')
      expect(handler.mock.calls[0][0].tradeType).toBe('sell')
    })
  })

  describe('onGraduated()', () => {
    it('should register graduated handler and connect', () => {
      const client = createClient()
      const handler = vi.fn()
      client.onGraduated(handler)
      vi.advanceTimersToNextTimer()
      expect(client.isConnected()).toBe(true)
    })

    it('should route graduated events to handler', () => {
      const client = createClient()
      const handler = vi.fn()
      client.onGraduated(handler)
      vi.advanceTimersToNextTimer()

      const ws = (client as any).ws as MockWebSocket
      ws._receive(JSON.stringify({
        event: 'graduated',
        coinType: '0xabc::coin::COIN',
        cetusPoolId: '0xcetuspool',
        deepbookPoolId: '0xdeepbookpool',
        ts: 1234567890,
      }))

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].event).toBe('graduated')
      expect(handler.mock.calls[0][0].cetusPoolId).toBe('0xcetuspool')
    })
  })

  describe('offNewToken()', () => {
    it('should remove handler', () => {
      const client = createClient()
      const handler = vi.fn()
      client.onNewToken(handler)
      client.offNewToken(handler)
      vi.advanceTimersToNextTimer()

      const ws = (client as any).ws as MockWebSocket
      if (ws && ws._receive) {
        ws._receive(JSON.stringify({
          event: 'new_token',
          coinType: '0xabc::coin::COIN',
          name: 'Test',
          symbol: 'TEST',
          creator: '0xcreator',
          ts: 1234567890,
        }))
      }

      expect(handler).not.toHaveBeenCalled()
    })

    it('should not disconnect if other handlers remain', () => {
      const client = createClient()
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      client.onNewToken(handler1)
      client.onTrade(handler2)
      vi.advanceTimersToNextTimer()
      expect(client.isConnected()).toBe(true)

      client.offNewToken(handler1)
      expect(client.isConnected()).toBe(true)
    })

    it('should disconnect when removing last handler', () => {
      const client = createClient()
      const handler = vi.fn()
      client.onNewToken(handler)
      vi.advanceTimersToNextTimer()
      expect(client.isConnected()).toBe(true)

      client.offNewToken(handler)
      expect(client.isConnected()).toBe(false)
    })
  })

  describe('offTrade()', () => {
    it('should remove trade handler', () => {
      const client = createClient()
      const handler = vi.fn()
      client.onTrade(handler)
      client.offTrade(handler)
      vi.advanceTimersToNextTimer()

      const ws = (client as any).ws as MockWebSocket
      if (ws && ws._receive) {
        ws._receive(JSON.stringify({
          event: 'trade',
          coinType: '0xabc::coin::COIN',
          tradeType: 'buy',
          suiAmount: '1000',
          tokenAmount: '500',
          trader: '0xtrader',
          priceMist: '2',
          curveProgress: 10,
          ts: 1234567890,
        }))
      }

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('offGraduated()', () => {
    it('should remove graduated handler', () => {
      const client = createClient()
      const handler = vi.fn()
      client.onGraduated(handler)
      client.offGraduated(handler)
      vi.advanceTimersToNextTimer()

      const ws = (client as any).ws as MockWebSocket
      if (ws && ws._receive) {
        ws._receive(JSON.stringify({
          event: 'graduated',
          coinType: '0xabc::coin::COIN',
          cetusPoolId: '0xcetuspool',
          ts: 1234567890,
        }))
      }

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('offChatMessage()', () => {
    it('should remove chat_message handler', () => {
      const client = createClient()
      const handler = vi.fn()
      client.onChatMessage(handler)
      client.offChatMessage(handler)
      vi.advanceTimersToNextTimer()

      const ws = (client as any).ws as MockWebSocket
      if (ws && ws._receive) {
        ws._receive(JSON.stringify({
          event: 'chat_message',
          coinType: '0xc',
          sender: '0xs',
          content: 'hello',
          ts: 1,
        }))
      }

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('offKothUpdate()', () => {
    it('should remove koth_update handler', () => {
      const client = createClient()
      const handler = vi.fn()
      client.onKothUpdate(handler)
      client.offKothUpdate(handler)
      vi.advanceTimersToNextTimer()

      const ws = (client as any).ws as MockWebSocket
      if (ws && ws._receive) {
        ws._receive(JSON.stringify({
          event: 'koth_update',
          coinType: '0xc',
          name: 'K',
          symbol: 'K',
          volumeSui: '100',
          priceMist: '10',
          marketCapSui: '500',
          holderCount: 10,
          lastUpdated: '2026-01-01T00:00:00Z',
          graduated: false,
          ts: 1,
        }))
      }

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('offReputationUpdate()', () => {
    it('should remove reputation_update handler', () => {
      const client = createClient()
      const handler = vi.fn()
      client.onReputationUpdate(handler)
      client.offReputationUpdate(handler)
      vi.advanceTimersToNextTimer()

      const ws = (client as any).ws as MockWebSocket
      if (ws && ws._receive) {
        ws._receive(JSON.stringify({
          event: 'reputation_update',
          address: '0xa',
          score: 100,
          tier: 'gold',
          tokensCreated: 5,
          tokensGraduated: 2,
          totalVolumeMist: '1000',
          earlySellFlags: 0,
          lastUpdated: '2026-01-01T00:00:00Z',
          ts: 1,
        }))
      }

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('connect()', () => {
    it('should connect and return this for chaining', () => {
      const client = createClient()
      const result = client.connect()
      expect(result).toBe(client)
      vi.advanceTimersToNextTimer()
      expect(client.isConnected()).toBe(true)
    })

    it('should log WebSocket errors', () => {
      const client = createClient()
      client.connect()
      vi.advanceTimersToNextTimer()

      const ws = (client as any).ws as MockWebSocket
      if (ws.onerror) {
        ws.onerror({ type: 'error', message: 'Connection failed' } as any)
      }

      expect(consoleSpy).toHaveBeenCalled()
    })
  })

  describe('disconnect()', () => {
    it('should close WebSocket and clear handlers', () => {
      const client = createClient()
      client.onNewToken(vi.fn())
      vi.advanceTimersToNextTimer()
      expect(client.isConnected()).toBe(true)

      client.disconnect()
      expect(client.isConnected()).toBe(false)
      expect((client as any).ws).toBeNull()
    })

    it('should handle disconnect when already disconnected', () => {
      const client = createClient()
      client.disconnect()
      expect((client as any).ws).toBeNull()
    })
  })

  describe('isConnected()', () => {
    it('should return false when not connected', () => {
      const client = createClient()
      expect(client.isConnected()).toBe(false)
    })

    it('should return true when connected', () => {
      const client = createClient()
      client.connect()
      vi.advanceTimersToNextTimer()
      expect(client.isConnected()).toBe(true)
    })

    it('should return false after disconnect', () => {
      const client = createClient()
      client.connect()
      vi.advanceTimersToNextTimer()
      client.disconnect()
      expect(client.isConnected()).toBe(false)
    })
  })

  describe('reconnection', () => {
    it('should attempt reconnection on close', () => {
      const client = createClient()
      client.onNewToken(vi.fn())
      vi.advanceTimersToNextTimer()

      const ws = (client as any).ws as MockWebSocket
      ws.onclose!({ type: 'close', code: 1006, reason: 'Abnormal', wasClean: false })

      vi.advanceTimersByTime(1000)
      expect((client as any).reconnectAttempts).toBe(1)
    })

    it('should stop reconnecting after max attempts', () => {
      const client = createClient()
      client.onNewToken(vi.fn())
      vi.advanceTimersToNextTimer()

      for (let i = 0; i < 6; i++) {
        const ws = (client as any).ws as MockWebSocket
        if (ws && ws.onclose) {
          ws.onclose({ type: 'close', code: 1006, reason: 'Abnormal', wasClean: false })
        }
        vi.advanceTimersByTime(1000 * (i + 1))
      }

      expect((client as any).reconnectAttempts).toBe(5)
      expect(consoleSpy).toHaveBeenCalledWith('Max reconnection attempts reached')
    })
  })

  describe('message parsing', () => {
    it('should handle invalid JSON gracefully', () => {
      const client = createClient()
      client.onNewToken(vi.fn())
      vi.advanceTimersToNextTimer()

      const ws = (client as any).ws as MockWebSocket
      ws._receive('not valid json')

      expect(consoleSpy).toHaveBeenCalled()
    })
  })

  describe('onChatMessage()', () => {
    it('should register chat_message handler and route events', () => {
      const client = createClient()
      const handler = vi.fn()
      client.onChatMessage(handler)
      vi.advanceTimersToNextTimer()
      expect(client.isConnected()).toBe(true)

      const ws = (client as any).ws as MockWebSocket
      ws._receive(JSON.stringify({
        event: 'chat_message',
        coinType: '0xabc::coin::COIN',
        sender: '0xsender',
        content: 'hello',
        ts: 1234567890,
      }))

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].event).toBe('chat_message')
    })
  })

  describe('onKothUpdate()', () => {
    it('should register koth_update handler and route events', () => {
      const client = createClient()
      const handler = vi.fn()
      client.onKothUpdate(handler)
      vi.advanceTimersToNextTimer()
      expect(client.isConnected()).toBe(true)

      const ws = (client as any).ws as MockWebSocket
      ws._receive(JSON.stringify({
        event: 'koth_update',
        coinType: '0xabc::coin::COIN',
        name: 'King',
        symbol: 'KOTH',
        volumeSui: '100000',
        priceMist: '10',
        marketCapSui: '50000',
        holderCount: 100,
        lastUpdated: '2026-01-01T00:00:00Z',
        graduated: false,
        ts: 1234567890,
      }))

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].event).toBe('koth_update')
    })
  })

  describe('onReputationUpdate()', () => {
    it('should register reputation_update handler and route events', () => {
      const client = createClient()
      const handler = vi.fn()
      client.onReputationUpdate(handler)
      vi.advanceTimersToNextTimer()
      expect(client.isConnected()).toBe(true)

      const ws = (client as any).ws as MockWebSocket
      ws._receive(JSON.stringify({
        event: 'reputation_update',
        address: '0xcreator',
        score: 500,
        tier: 'gold',
        tokensCreated: 5,
        tokensGraduated: 2,
        totalVolumeMist: '1000000000',
        earlySellFlags: 0,
        lastUpdated: '2026-01-01T00:00:00Z',
        ts: 1234567890,
      }))

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].event).toBe('reputation_update')
    })
  })

  describe('method chaining', () => {
    it('should support chaining on* methods', () => {
      const client = createClient()
      const result = client
        .onNewToken(vi.fn())
        .onTrade(vi.fn())
        .onGraduated(vi.fn())
        .onChatMessage(vi.fn())
        .onKothUpdate(vi.fn())
        .onReputationUpdate(vi.fn())
      expect(result).toBe(client)
    })

    it('should support chaining off* methods', () => {
      const h1 = vi.fn()
      const h2 = vi.fn()
      const h3 = vi.fn()
      const h4 = vi.fn()
      const h5 = vi.fn()
      const h6 = vi.fn()
      const client = createClient()
      client
        .onNewToken(h1)
        .onTrade(h2)
        .onGraduated(h3)
        .onChatMessage(h4)
        .onKothUpdate(h5)
        .onReputationUpdate(h6)
      const result = client
        .offNewToken(h1)
        .offTrade(h2)
        .offGraduated(h3)
      expect(result).toBe(client)
    })
  })
})
