import type { SuiPumpConfig } from './client.js'

export class MediaClient {
  constructor(private config: Required<SuiPumpConfig>) {}

  private get apiBaseUrl() {
    return this.config.apiBaseUrl
  }

  private get apiKey() {
    return this.config.apiKey
  }

  async upload(data: string, contentType: string = 'image/png'): Promise<{ blobId: string }> {
    const response = await fetch(`${this.apiBaseUrl}/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify({ data, contentType }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Media upload failed: ${response.status} - ${error}`)
    }

    return response.json() as Promise<{ blobId: string }>
  }

  getUrl(blobId: string, network: 'mainnet' | 'testnet' = 'mainnet'): string {
    return `https://aggregator.walrus-${network}.walrus.space/v1/${blobId}`
  }
}
