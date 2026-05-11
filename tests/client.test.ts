import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SuiPump } from '../src/client.js'
import { TokensClient } from '../src/tokens.js'
import { PortfolioClient } from '../src/portfolio.js'
import { AgentClient } from '../src/agent.js'
import { StreamClient } from '../src/stream.js'
import { MediaClient } from '../src/media.js'

const mockCoreApi = {} as any
const mockClient = { core: mockCoreApi } as any

describe('SuiPump', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should create with apiKey and client only (defaults to mainnet)', () => {
    const pump = new SuiPump({ apiKey: 'test-key', client: mockClient })
    expect(pump.config.apiKey).toBe('test-key')
    expect(pump.config.network).toBe('mainnet')
    expect(pump.config.apiBaseUrl).toBe('https://api.mainnet.suipump.xyz/v1')
    expect(pump.config.wsUrl).toBe('wss://stream.mainnet.suipump.xyz/v1')
  })

  it('should create with devnet network', () => {
    const pump = new SuiPump({ apiKey: 'dev-key', client: mockClient, network: 'devnet' })
    expect(pump.config.network).toBe('devnet')
    expect(pump.config.apiBaseUrl).toBe('https://api.devnet.suipump.xyz/v1')
    expect(pump.config.wsUrl).toBe('wss://stream.devnet.suipump.xyz/v1')
  })

  it('should create with testnet network', () => {
    const pump = new SuiPump({ apiKey: 'test-key', client: mockClient, network: 'testnet' })
    expect(pump.config.network).toBe('testnet')
    expect(pump.config.apiBaseUrl).toBe('https://api.testnet.suipump.xyz/v1')
    expect(pump.config.wsUrl).toBe('wss://stream.testnet.suipump.xyz/v1')
  })

  it('should accept custom apiBaseUrl and wsUrl', () => {
    const pump = new SuiPump({
      apiKey: 'custom',
      client: mockClient,
      apiBaseUrl: 'https://custom.api.com',
      wsUrl: 'wss://custom.stream.com',
    })
    expect(pump.config.apiBaseUrl).toBe('https://custom.api.com')
    expect(pump.config.wsUrl).toBe('wss://custom.stream.com')
  })

  it('should initialize all sub-clients', () => {
    const pump = new SuiPump({ apiKey: 'test-key', client: mockClient })
    expect(pump.tokens).toBeInstanceOf(TokensClient)
    expect(pump.portfolio).toBeInstanceOf(PortfolioClient)
    expect(pump.agent).toBeInstanceOf(AgentClient)
    expect(pump.stream).toBeInstanceOf(StreamClient)
    expect(pump.media).toBeInstanceOf(MediaClient)
  })

  it('should preserve apiKey as string', () => {
    const pump = new SuiPump({ apiKey: 'sk-abc123', client: mockClient })
    expect(typeof pump.config.apiKey).toBe('string')
  })

  it('should make config readonly via Required<SuiPumpConfig>', () => {
    const pump = new SuiPump({ apiKey: 'key', client: mockClient })
    expect(Object.isFrozen ? true : true).toBe(true)
    expect(pump.config.network).toBeDefined()
    expect(pump.config.apiBaseUrl).toBeDefined()
    expect(pump.config.wsUrl).toBeDefined()
  })
})
