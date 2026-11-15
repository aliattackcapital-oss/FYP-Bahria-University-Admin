import { useCallback, useEffect, useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

type AgentPromptPayload = {
  configured?: boolean
  generalPrompt?: string
  beginMessage?: string | null
  error?: string
}

export function AgentPrompt() {
  const [prompt, setPrompt] = useState('')
  const [loadedPrompt, setLoadedPrompt] = useState('')
  const [beginMessage, setBeginMessage] = useState('')
  const [loadedBeginMessage, setLoadedBeginMessage] = useState('')
  const [configured, setConfigured] = useState(true)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const dirty = prompt !== loadedPrompt || beginMessage !== loadedBeginMessage

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiFetch('/api/agent-prompt')
      const data = (await response.json()) as AgentPromptPayload
      if (!response.ok) throw new Error(data.error || 'Failed to load prompt')
      if (!data.configured) {
        setConfigured(false)
        setPrompt('')
        setLoadedPrompt('')
        setBeginMessage('')
        setLoadedBeginMessage('')
        return
      }
      setConfigured(true)
      const text = data.generalPrompt ?? ''
      const begin = data.beginMessage ?? ''
      setPrompt(text)
      setLoadedPrompt(text)
      setBeginMessage(begin)
      setLoadedBeginMessage(begin)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompt')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const publish = async () => {
    if (!prompt.trim()) {
      setError('Prompt cannot be empty.')
      return
    }
    setPublishing(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await apiFetch('/api/agent-prompt', {
        method: 'POST',
        body: JSON.stringify({ generalPrompt: prompt, beginMessage }),
      })
      const data = (await response.json()) as AgentPromptPayload
      if (!response.ok) throw new Error(data.error || 'Publish failed')
      const text = data.generalPrompt ?? prompt
      const begin = data.beginMessage ?? beginMessage
      setPrompt(text)
      setLoadedPrompt(text)
      setBeginMessage(begin)
      setLoadedBeginMessage(begin)
      setSuccess('Changes saved and published. Live calls will use this version.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  const revert = () => {
    setPrompt(loadedPrompt)
    setBeginMessage(loadedBeginMessage)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Agent prompt</h1>
        <p className="text-sm text-muted-foreground">
          Edit the LLM system prompt for your voice agent.
        </p>
      </header>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {success ? (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading prompt…
        </p>
      ) : !configured ? (
        <Alert>
          <AlertDescription>Agent prompt is not available. Contact your administrator.</AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="general-prompt">General prompt</Label>
              <span className="text-xs text-muted-foreground">
                {prompt.length.toLocaleString()} characters
                {dirty ? ' · unsaved changes' : ''}
              </span>
            </div>
            <textarea
              id="general-prompt"
              rows={22}
              className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2 font-mono text-sm leading-relaxed"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="opening-line">Opening Line</Label>
            <textarea
              id="opening-line"
              rows={4}
              className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm leading-relaxed"
              value={beginMessage}
              onChange={(e) => setBeginMessage(e.target.value)}
              placeholder="First line the agent speaks when a call starts"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" disabled={publishing || !dirty} onClick={() => void publish()}>
              {publishing ? <Loader2 className="animate-spin" /> : <Upload className="size-4" />}
              Publish changes
            </Button>
            <Button type="button" variant="outline" disabled={publishing || !dirty} onClick={revert}>
              Revert edits
            </Button>
          </div>
        </>
      )}
    </div>
  )
}