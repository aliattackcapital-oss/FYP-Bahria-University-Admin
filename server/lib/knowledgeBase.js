import multer from 'multer'
import { resolveVoiceIds, knowledgeBaseConfigured } from './orgVoice.js'
import { fetchRetell } from './retellFetch.js'
import { clientError, normalizeHttpUrl } from './urls.js'

function apiKey() {
  return process.env.RETELL_API_KEY?.replace(/^Bearer\s+/i, '').trim()
}

export function knowledgeBaseId(organization) {
  return resolveVoiceIds(organization).knowledgeBaseId
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 25 },
})

export const parseKnowledgeFiles = upload.array('files', 25)

export async function fetchKnowledgeBase(organization) {
  const key = apiKey()
  const id = knowledgeBaseId(organization)
  if (!key) throw new Error('Missing RETELL_API_KEY.')
  if (!id) throw new Error('Missing knowledge base id for this organization.')

  const response = await fetchRetell(
    `https://api.retellai.com/get-knowledge-base/${encodeURIComponent(id)}`,
    { headers: { Authorization: `Bearer ${key}` } },
  )
  const details = await response.text()
  if (!response.ok) {
    throw new Error(`Could not load knowledge base (${response.status}): ${details}`)
  }
  return JSON.parse(details)
}

export async function addKnowledgeSources(organization, { files, urls }) {
  const key = apiKey()
  const id = knowledgeBaseId(organization)
  if (!key) throw new Error('Missing RETELL_API_KEY.')
  if (!id) throw new Error('Missing knowledge base id for this organization.')

  const fileList = files ?? []
  const rawUrls = (urls ?? []).map(String).filter((value) => value.trim())
  const urlList = rawUrls.map(normalizeHttpUrl).filter(Boolean)
  if (fileList.length === 0 && rawUrls.length > 0 && urlList.length === 0) {
    throw clientError('Enter valid http(s) page URLs.')
  }
  if (fileList.length === 0 && urlList.length === 0) {
    throw clientError('Choose files or add a webpage.')
  }

  const form = new FormData()
  for (const file of fileList) {
    const blob = new Blob([file.buffer], {
      type: file.mimetype || 'application/octet-stream',
    })
    form.append('knowledge_base_files', blob, file.originalname)
  }
  if (urlList.length > 0) {
    form.append('knowledge_base_urls', JSON.stringify(urlList))
  }

  const response = await fetchRetell(
    `https://api.retellai.com/add-knowledge-base-sources/${encodeURIComponent(id)}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    },
  )
  const details = await response.text()
  if (!response.ok) {
    throw new Error(`Could not add sources (${response.status}): ${details}`)
  }
  return JSON.parse(details)
}

