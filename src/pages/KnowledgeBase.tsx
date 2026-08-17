import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { FileUp, Files, Globe, Loader2, Plus } from 'lucide-react'
import type { KnowledgeBaseSource, KnowledgeBaseStatus } from '@/types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function sourceLabel(source: KnowledgeBaseSource) {
  if (source.type === 'document') return source.filename || 'Document'
  if (source.type === 'text') return source.title || 'Text'
  return source.url || 'URL'
}

function formatSize(bytes?: number) {
  if (!bytes || bytes <= 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function statusLabel(status?: KnowledgeBaseStatus) {
  if (status === 'complete') return 'Ready'
  if (status === 'in_progress' || status === 'refreshing_in_progress') {
    return 'Indexing'
  }
  if (status === 'error') return 'Error'
  return 'Unknown'
}

function displayUrl(url: string) {
  try {
    const parsed = new URL(url)
    const path = `${parsed.pathname}${parsed.search}`
    return path === '/' ? parsed.host : `${parsed.host}${path}`
  } catch {
    return url
  }
}

export function KnowledgeBase() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('Agent knowledge base')
  const [status, setStatus] = useState<KnowledgeBaseStatus | undefined>()
  const [sources, setSources] = useState<KnowledgeBaseSource[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [addMode, setAddMode] = useState<'choose' | 'webpage'>('choose')
  const [pageUrl, setPageUrl] = useState('')
  const [foundUrls, setFoundUrls] = useState<string[]>([])
  const [selectedUrls, setSelectedUrls] = useState<string[]>([])
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanWarning, setScanWarning] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const applyKb = (data: {
    name?: string
    status?: KnowledgeBaseStatus
    sources?: KnowledgeBaseSource[]
  }) => {
    setName(data.name || 'Agent knowledge base')
    setStatus(data.status)
    setSources(data.sources ?? [])
  }

  const load = async () => {
    try {
      const response = await fetch('/api/knowledge-base')
      const data = (await response.json()) as {
        name?: string
        status?: KnowledgeBaseStatus
        sources?: KnowledgeBaseSource[]
        error?: string
      }
      if (!response.ok) throw new Error(data.error || 'Failed to load knowledge base')
      applyKb(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load knowledge base')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (status !== 'in_progress' && status !== 'refreshing_in_progress') return
    const id = window.setInterval(() => void load(), 4000)
    return () => window.clearInterval(id)
  }, [status])

  const resetAddModal = () => {
    setAddMode('choose')
    setPageUrl('')
    setFoundUrls([])
    setSelectedUrls([])
    setScanning(false)
    setScanError(null)
    setScanWarning(null)
  }

  const onAddOpenChange = (open: boolean) => {
    setAddOpen(open)
    if (!open) resetAddModal()
  }

  const submitSources = async (body: FormData) => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/knowledge-base', {
        method: 'POST',
        body,
      })
      const data = (await response.json()) as {
        name?: string
        status?: KnowledgeBaseStatus
        sources?: KnowledgeBaseSource[]
        error?: string
      }
      if (!response.ok) throw new Error(data.error || 'Failed to add to knowledge base')
      applyKb(data)
      void load()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to knowledge base')
      return false
    } finally {
      setSaving(false)
    }
  }

  const onPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return
    const body = new FormData()
    for (const file of files) body.append('files', file)
    await submitSources(body)
  }

  const onFindPages = async (event?: { preventDefault(): void }) => {
    event?.preventDefault()
    const url = pageUrl.trim()
    if (!url) return
    setScanning(true)
    setScanError(null)
    setScanWarning(null)
    setFoundUrls([])
    setSelectedUrls([])
    try {
      const response = await fetch('/api/knowledge-base/sitemap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = (await response.json()) as {
        urls?: string[]
        error?: string
        warning?: string
        fallback?: boolean
        truncated?: boolean
      }
      if (!response.ok) throw new Error(data.error || 'Could not scan sitemap')
      const urls = data.urls ?? []
      if (urls.length === 0) {
        throw new Error('No pages found. Use a site with sitemap.xml.')
      }
      setFoundUrls(urls)
      setScanWarning(
        data.warning ??
          (data.truncated ? `Showing the first ${urls.length} pages from the sitemap.` : null),
      )
      if (urls.length === 1) setSelectedUrls(urls)
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Could not scan sitemap')
    } finally {
      setScanning(false)
    }
  }

  const onAddPages = async (event: FormEvent) => {
    event.preventDefault()
    if (selectedUrls.length === 0) return
    const body = new FormData()
    body.append('urls', JSON.stringify(selectedUrls))
    const ok = await submitSources(body)
    if (ok) onAddOpenChange(false)
  }

  const toggleUrl = (url: string) => {
    setSelectedUrls((current) =>
      current.includes(url) ? current.filter((item) => item !== url) : [...current, url],
    )
  }

  const allSelected = foundUrls.length > 0 && selectedUrls.length === foundUrls.length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agent Knowledgebase</h1>
          <p className="text-sm text-muted-foreground">
            Files and webpages the receptionist can reference during calls.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={status === 'complete' ? 'secondary' : 'outline'}>
            {statusLabel(status)}
          </Badge>
          <Button
            type="button"
            onClick={() => {
              setAddMode('choose')
              setAddOpen(true)
            }}
            disabled={saving}
          >
            <Plus />
            Add knowledgebase
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.doc,.docx,.md,.csv,.json"
        className="hidden"
        onChange={(event) => void onPick(event)}
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {saving && (
        <p className="text-sm text-muted-foreground">Adding to knowledge base…</p>
      )}

      {loading && (
        <p className="text-sm text-muted-foreground">Loading documents…</p>
      )}

      {!loading && sources.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-xl bg-muted">
            <Files className="size-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No sources yet</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Add a file or webpage to {name}.
          </p>
        </div>
      )}

      {!loading && sources.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-12 px-4">Name</TableHead>
                <TableHead className="h-12 px-4">Type</TableHead>
                <TableHead className="h-12 px-4">Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((source) => (
                <TableRow key={source.source_id}>
                  <TableCell className="max-w-[32rem] px-4 py-4 font-medium whitespace-normal break-all">
                    {sourceLabel(source)}
                  </TableCell>
                  <TableCell className="px-4 py-4 capitalize text-muted-foreground">
                    {source.type}
                  </TableCell>
                  <TableCell className="px-4 py-4 text-muted-foreground">
                    {formatSize(source.file_size)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={onAddOpenChange}>
        <DialogContent className={addMode === 'webpage' ? 'max-w-xl' : undefined}>
          {addMode === 'choose' ? (
            <>
              <DialogHeader>
                <DialogTitle>Add knowledgebase</DialogTitle>
                <DialogDescription>
                  Choose how you want to add sources the receptionist can use on calls.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <button
                  type="button"
                  className="flex items-start gap-3 rounded-lg border bg-card p-4 text-start transition-colors hover:bg-accent"
                  onClick={() => {
                    onAddOpenChange(false)
                    inputRef.current?.click()
                  }}
                >
                  <FileUp className="mt-0.5 size-5 shrink-0 text-primary" />
                  <span>
                    <span className="block font-medium">Choose files</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      Upload PDFs, docs, or other files.
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="flex items-start gap-3 rounded-lg border bg-card p-4 text-start transition-colors hover:bg-accent"
                  onClick={() => setAddMode('webpage')}
                >
                  <Globe className="mt-0.5 size-5 shrink-0 text-primary" />
                  <span>
                    <span className="block font-medium">Add webpage</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      Scan a site sitemap and pick pages to add.
                    </span>
                  </span>
                </button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Add webpage</DialogTitle>
                <DialogDescription>
                  Scan the site sitemap, then choose which pages to add to the knowledge base.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(event) =>
                  void (foundUrls.length > 0 ? onAddPages(event) : onFindPages(event))
                }
                className="flex min-h-0 flex-1 flex-col gap-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="kb-url">Website URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="kb-url"
                      type="text"
                      inputMode="url"
                      autoComplete="url"
                      placeholder="https://bahria.edu.pk"
                      value={pageUrl}
                      onChange={(event) => {
                        setPageUrl(event.target.value)
                        if (foundUrls.length > 0 || scanError || scanWarning) {
                          setFoundUrls([])
                          setSelectedUrls([])
                          setScanError(null)
                          setScanWarning(null)
                        }
                      }}
                      required
                      disabled={scanning || saving}
                    />
                    <Button
                      type={foundUrls.length > 0 ? 'button' : 'submit'}
                      variant="outline"
                      className="shrink-0"
                      disabled={scanning || saving || !pageUrl.trim()}
                      onClick={foundUrls.length > 0 ? () => void onFindPages() : undefined}
                    >
                      {scanning ? <Loader2 className="animate-spin" /> : null}
                      Find pages
                    </Button>
                  </div>
                </div>

                {scanning && (
                  <p className="text-sm text-muted-foreground">Scanning sitemap…</p>
                )}
                {scanError && (
                  <Alert variant="destructive">
                    <AlertDescription>{scanError}</AlertDescription>
                  </Alert>
                )}
                {scanWarning && !scanError && (
                  <p className="text-sm text-muted-foreground">{scanWarning}</p>
                )}

                {foundUrls.length > 0 && (
                  <div className="flex min-h-0 flex-1 flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground">
                        {selectedUrls.length} of {foundUrls.length} selected
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedUrls(allSelected ? [] : foundUrls)}
                      >
                        {allSelected ? 'Select none' : 'Select all'}
                      </Button>
                    </div>
                    <div className="max-h-56 min-h-0 overflow-y-auto rounded-md border">
                      <ul className="divide-y">
                        {foundUrls.map((url) => {
                          const checked = selectedUrls.includes(url)
                          return (
                            <li key={url}>
                              <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-accent/50">
                                <input
                                  type="checkbox"
                                  className="mt-0.5 size-4 shrink-0 rounded border border-input accent-primary"
                                  checked={checked}
                                  onChange={() => toggleUrl(url)}
                                />
                                <span className="min-w-0 break-all text-sm leading-5" title={url}>
                                  {displayUrl(url)}
                                </span>
                              </label>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setPageUrl('')
                      setFoundUrls([])
                      setSelectedUrls([])
                      setScanning(false)
                      setScanError(null)
                      setScanWarning(null)
                      setAddMode('choose')
                    }}
                  >
                    Back
                  </Button>
                  {foundUrls.length > 0 ? (
                    <Button type="submit" disabled={scanning || saving || selectedUrls.length === 0}>
                      Add {selectedUrls.length} page{selectedUrls.length === 1 ? '' : 's'}
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => onAddOpenChange(false)}>
                      Cancel
                    </Button>
                  )}
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
