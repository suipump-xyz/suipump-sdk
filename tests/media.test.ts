import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MediaClient } from '../src/media.js'

const defaultConfig = {
  apiKey: 'test-api-key',
  client: {} as any,
  network: 'mainnet' as const,
  apiBaseUrl: 'https://api.mainnet.suipump.xyz/v1',
  wsUrl: 'wss://stream.mainnet.suipump.xyz/v1',
}

function createClient(config: any = defaultConfig) {
  return new MediaClient(config)
}

function mockFetch(response: any) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(''),
  })
}

function mockFetchError(status: number, message: string) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    text: () => Promise.resolve(message),
  })
}

function mockFetchNetworkError(error: Error) {
  return vi.fn().mockRejectedValue(error)
}

describe('MediaClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch({}))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('upload()', () => {
    it('should upload a base64 string', async () => {
      vi.stubGlobal('fetch', mockFetch({ blobId: 'blob_123' }))
      const client = createClient()
      const result = await client.upload('base64encodeddata', 'image/png')
      expect(result.blobId).toBe('blob_123')
    })

    it('should send JSON body with data and contentType', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ blobId: 'blob_456' }),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      const result = await client.upload('base64data', 'image/jpeg')
      expect(result.blobId).toBe('blob_456')
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.data).toBe('base64data')
      expect(body.contentType).toBe('image/jpeg')
    })

    it('should use default contentType when not provided', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ blobId: 'blob_789' }),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.upload('data')
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.contentType).toBe('image/png')
    })

    it('should send correct headers', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ blobId: 'blob_789' }),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.upload('data')
      expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBe('application/json')
      expect(fetchMock.mock.calls[0][1].headers['X-API-Key']).toBe('test-api-key')
      expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    })

    it('should throw on upload error', async () => {
      vi.stubGlobal('fetch', mockFetchError(413, 'File too large'))
      const client = createClient()
      await expect(client.upload('data')).rejects.toThrow('Media upload failed: 413 - File too large')
    })

    it('should throw on network error', async () => {
      vi.stubGlobal('fetch', mockFetchNetworkError(new Error('Upload timeout')))
      const client = createClient()
      await expect(client.upload('data')).rejects.toThrow('Upload timeout')
    })
  })

  describe('getUrl()', () => {
    it('should return mainnet URL by default', () => {
      const client = createClient()
      const url = client.getUrl('blob_abc123')
      expect(url).toBe('https://aggregator.walrus-mainnet.walrus.space/v1/blob_abc123')
    })

    it('should return mainnet URL explicitly', () => {
      const client = createClient()
      const url = client.getUrl('blob_abc123', 'mainnet')
      expect(url).toBe('https://aggregator.walrus-mainnet.walrus.space/v1/blob_abc123')
    })

    it('should return testnet URL', () => {
      const client = createClient()
      const url = client.getUrl('blob_test', 'testnet')
      expect(url).toBe('https://aggregator.walrus-testnet.walrus.space/v1/blob_test')
    })
  })
})
