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
    it('should upload a Blob', async () => {
      vi.stubGlobal('fetch', mockFetch({ blobId: 'blob_123' }))
      const client = createClient()
      const blob = new Blob(['test data'], { type: 'text/plain' })
      const result = await client.upload(blob)
      expect(result.blobId).toBe('blob_123')
    })

    it('should upload an ArrayBuffer', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ blobId: 'blob_456' }),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      const buffer = new ArrayBuffer(8)
      const view = new Uint8Array(buffer)
      view.set([1, 2, 3, 4, 5, 6, 7, 8])
      const result = await client.upload(buffer)
      expect(result.blobId).toBe('blob_456')
      const body = fetchMock.mock.calls[0][1].body
      expect(body).toBeInstanceOf(Blob)
    })

    it('should upload a File (File extends Blob)', async () => {
      vi.stubGlobal('fetch', mockFetch({ blobId: 'blob_file' }))
      const client = createClient()
      const file = new File(['file content'], 'test.txt', { type: 'text/plain' })
      const result = await client.upload(file)
      expect(result.blobId).toBe('blob_file')
    })

    it('should handle non-Blob, non-ArrayBuffer input via fallback', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ blobId: 'blob_fallback' }),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      const result = await client.upload('string as file' as any)
      expect(result.blobId).toBe('blob_fallback')
    })

    it('should send correct headers without Content-Type', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ blobId: 'blob_789' }),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.upload(new Blob(['data']))
      expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBeUndefined()
      expect(fetchMock.mock.calls[0][1].headers['X-API-Key']).toBe('test-api-key')
      expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    })

    it('should throw on upload error', async () => {
      vi.stubGlobal('fetch', mockFetchError(413, 'File too large'))
      const client = createClient()
      await expect(client.upload(new Blob(['data']))).rejects.toThrow('Media upload failed: 413 - File too large')
    })

    it('should throw on network error', async () => {
      vi.stubGlobal('fetch', mockFetchNetworkError(new Error('Upload timeout')))
      const client = createClient()
      await expect(client.upload(new Blob(['data']))).rejects.toThrow('Upload timeout')
    })
  })

  describe('uploadFromUrl()', () => {
    it('should upload from URL', async () => {
      vi.stubGlobal('fetch', mockFetch({ blobId: 'blob_from_url' }))
      const client = createClient()
      const result = await client.uploadFromUrl('https://example.com/image.png')
      expect(result.blobId).toBe('blob_from_url')
    })

    it('should send URL in request body', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ blobId: 'blob_url' }),
        text: () => Promise.resolve(''),
      })
      vi.stubGlobal('fetch', fetchMock)
      const client = createClient()
      await client.uploadFromUrl('https://example.com/image.png')
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.url).toBe('https://example.com/image.png')
      expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBe('application/json')
      expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    })

    it('should throw on upload from URL error', async () => {
      vi.stubGlobal('fetch', mockFetchError(400, 'Invalid URL'))
      const client = createClient()
      await expect(client.uploadFromUrl('invalid-url')).rejects.toThrow('Media upload from URL failed: 400 - Invalid URL')
    })

    it('should throw on network error', async () => {
      vi.stubGlobal('fetch', mockFetchNetworkError(new Error('DNS resolution failed')))
      const client = createClient()
      await expect(client.uploadFromUrl('https://example.com/image.png')).rejects.toThrow('DNS resolution failed')
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
