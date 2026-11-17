import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CopySecretDialog } from '@/components/CopySecretDialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type OrgRow = {
  id: string
  slug: string
  name: string
  status: string
  website_url?: string | null
  retell_agent_id?: string | null
  created_at: string
}

export function PlatformOrganizations() {
  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [superAdminEmail, setSuperAdminEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [secretDialog, setSecretDialog] = useState<{
    title: string
    description: string
    secret: string
  } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiFetch('/api/platform/organizations')
      const data = (await response.json()) as { organizations?: OrgRow[]; error?: string }
      if (!response.ok) throw new Error(data.error || 'Failed to load organizations')
      setOrgs(data.organizations ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const createOrg = async () => {
    setCreating(true)
    setError(null)
    try {
      const response = await apiFetch('/api/platform/organizations', {
        method: 'POST',
        body: JSON.stringify({
          organizationName: name.trim(),
          websiteUrl: websiteUrl.trim(),
          superAdminEmail: superAdminEmail.trim(),
        }),
      })
      const data = (await response.json()) as {
        copyLinkOnce?: string
        error?: string
        message?: string
      }
      if (!response.ok) throw new Error(data.error || 'Create failed')
      setName('')
      setWebsiteUrl('')
      setSuperAdminEmail('')
      await load()
      window.dispatchEvent(new Event('platform-usage-updated'))
      if (data.copyLinkOnce) {
        setSecretDialog({
          title: 'Super admin invite',
          description: data.message || 'Share this link once with the new super admin.',
          secret: data.copyLinkOnce,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setCreating(false)
    }
  }

  const deleteOrg = async (organizationId: string, orgName: string) => {
    if (!window.confirm(`Delete organization "${orgName}"? This cannot be undone.`)) return
    setError(null)
    try {
      const response = await apiFetch(
        `/api/platform/organizations?organizationId=${encodeURIComponent(organizationId)}`,
        { method: 'DELETE' },
      )
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error || 'Delete failed')
      await load()
      window.dispatchEvent(new Event('platform-usage-updated'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
        <p className="text-sm text-muted-foreground">
          Create tenant organizations, provision a voice agent, and invite each super admin.
        </p>
      </header>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="space-y-4 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Create organization</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="University or department name"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="org-website">Organization website</Label>
            <Input
              id="org-website"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://www.example.edu"
            />
            <p className="text-xs text-muted-foreground">
              Used as the first knowledge base source in Retell (daily refresh enabled).
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="super-email">Super admin email</Label>
            <Input
              id="super-email"
              type="email"
              value={superAdminEmail}
              onChange={(e) => setSuperAdminEmail(e.target.value)}
              placeholder="super.admin@example.com"
            />
          </div>
        </div>
        <Button
          type="button"
          disabled={creating || !name.trim() || !websiteUrl.trim() || !superAdminEmail.trim()}
          onClick={() => void createOrg()}
        >
          {creating ? <Loader2 className="animate-spin" /> : <Plus className="size-4" />}
          Create organization
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">All organizations</h2>
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </p>
        ) : orgs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No organizations yet.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {orgs.map((org) => (
              <li key={org.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">{org.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {org.slug} · {org.status}
                    {org.website_url ? ` · ${org.website_url}` : ''}
                    {org.retell_agent_id ? ' · agent provisioned' : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void deleteOrg(org.id, org.name)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CopySecretDialog
        open={secretDialog !== null}
        title={secretDialog?.title ?? ''}
        description={secretDialog?.description ?? ''}
        secret={secretDialog?.secret ?? null}
        onClose={() => setSecretDialog(null)}
      />
    </div>
  )
}