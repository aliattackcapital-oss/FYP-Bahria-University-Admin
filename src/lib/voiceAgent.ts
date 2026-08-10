import type { CallStatus } from '@/types'
import { RetellWebClient } from 'retell-client-js-sdk'

export type StatusListener = (status: CallStatus) => void
export type ErrorListener = (message: string | null) => void

/**
 * Browser voice-call surface for Ali.
 * Creates a short-lived access token via our API, then connects with the Web SDK.
 * @see https://docs.retellai.com/deploy/web-call
 */
class VoiceAgent {
  private status: CallStatus = 'idle'
  private listeners = new Set<StatusListener>()
  private errorListeners = new Set<ErrorListener>()
  private client: RetellWebClient | null = null
  private resetTimer: ReturnType<typeof setTimeout> | null = null
  private wired = false

  getStatus(): CallStatus {
    return this.status
  }

  onStatusChange(listener: StatusListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener)
    return () => {
      this.errorListeners.delete(listener)
    }
  }

  private setStatus(status: CallStatus) {
    this.status = status
    this.listeners.forEach((listener) => listener(status))
  }

  private setError(message: string | null) {
    this.errorListeners.forEach((listener) => listener(message))
  }

  private ensureClient(): RetellWebClient {
    if (this.client) return this.client

    const client = new RetellWebClient()
    this.client = client

    if (!this.wired) {
      this.wired = true
      client.on('call_started', () => {
        this.setError(null)
        this.setStatus('in_call')
      })
      client.on('call_ended', () => {
        this.handleEnded()
      })
      client.on('error', (error) => {
        const message =
          typeof error === 'string'
            ? error
            : error instanceof Error
              ? error.message
              : 'Call failed. Please try again.'
        this.setError(message)
        try {
          client.stopCall()
        } catch {
          // ignore cleanup errors
        }
        this.handleEnded()
      })
    }

    return client
  }

  private handleEnded() {
    if (this.status === 'idle') return
    this.setStatus('ended')
    this.clearTimers()
    this.resetTimer = setTimeout(() => {
      if (this.status === 'ended') this.setStatus('idle')
    }, 1600)
  }

  async startCall(): Promise<void> {
    if (this.status === 'connecting' || this.status === 'in_call') return

    this.clearTimers()
    this.setError(null)
    this.setStatus('connecting')

    try {
      const response = await fetch('/api/create-web-call', { method: 'POST' })
      const data = (await response.json()) as {
        accessToken?: string
        error?: string
        details?: string
      }

      if (!response.ok || !data.accessToken) {
        throw new Error(data.error || data.details || 'Could not start the call')
      }

      const client = this.ensureClient()
      await client.startCall({
        accessToken: data.accessToken,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not start the call'
      this.setError(message)
      this.setStatus('idle')
    }
  }

  async endCall(): Promise<void> {
    if (this.status === 'idle') return

    try {
      this.client?.stopCall()
    } catch {
      // ignore
    }

    // stopCall should emit call_ended; fall back if it doesn't
    if (this.status === 'connecting' || this.status === 'in_call') {
      this.handleEnded()
    }
  }

  private clearTimers() {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer)
      this.resetTimer = null
    }
  }
}

export const voiceAgent = new VoiceAgent()

export function startCall() {
  return voiceAgent.startCall()
}

export function endCall() {
  return voiceAgent.endCall()
}

export function onStatusChange(listener: StatusListener) {
  return voiceAgent.onStatusChange(listener)
}

export function onCallError(listener: ErrorListener) {
  return voiceAgent.onError(listener)
}
