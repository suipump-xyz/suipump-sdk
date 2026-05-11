// sdk/src/media.ts - Media upload helpers

import type { SuiPumpConfig } from './client.js'

export class MediaClient {
  constructor(private config: Required<SuiPumpConfig>) {}

  private get apiBaseUrl() {
    return this.config.apiBaseUrl
  }

  private get apiKey() {
    return this.config.apiKey
  }

  async upload(file: File | Blob | ArrayBuffer): Promise<{ blobId: string }> {
    let body: Blob

    if (file instanceof ArrayBuffer) {
      body = new Blob([file])
    } else if (file instanceof Blob) {
      body = file
    } else {
      body = file
    }

    const response = await fetch(`${this.apiBaseUrl}/media/upload`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
      },
      body,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Media upload failed: ${response.status} - ${error}`)
    }

    return response.json() as Promise<{ blobId: string }>
  }

  async uploadFromUrl(url: string): Promise<{ blobId: string }> {
    const response = await fetch(`${this.apiBaseUrl}/media/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify({ url }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Media upload from URL failed: ${response.status} - ${error}`)
    }

    return response.json() as Promise<{ blobId: string }>
  }

  getUrl(blobId: string, network: 'mainnet' | 'testnet' = 'mainnet'): string {
    return `https://aggregator.walrus-${network}.walrus.space/v1/${blobId}`
  }
}