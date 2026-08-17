import { normalizeHttpUrl, sameSite } from './urls.js'

const MAX_URLS = 500
const MAX_DEPTH = 3
const MAX_SITEMAP_FETCHES = 30
const FETCH_MS = 10_000
const BATCH_SIZE = 4
const MAX_HTML_PAGES = 6

export { normalizeHttpUrl }

function decodeXml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

function cleanLoc(raw) {
  let value = String(raw || '').trim()
  const cdata = /^<!\[CDATA\[(.*)\]\]>$/s.exec(value)
  if (cdata) value = cdata[1].trim()
  return decodeXml(value)
}

function extractLocs(xml) {
  const locs = []
  const re = /<loc(?:\s[^>]*)?>\s*([^<]+?)\s*<\/loc>/gi
  let match
  while ((match = re.exec(xml))) {
    const loc = cleanLoc(match[1])
    if (loc) locs.push(loc)
  }
  return locs
}

function extractHrefs(html) {
  const hrefs = []
  const re = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi
  let match
  while ((match = re.exec(html))) {
    const href = match[1] ?? match[2] ?? match[3]
    if (href) hrefs.push(decodeXml(href.trim()))
  }
  return hrefs
}

async function fetchText(url, accept = 'application/xml,text/xml,text/plain,*/*;q=0.8') {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        Accept: accept,
        'User-Agent': 'Mozilla/5.0 (compatible; VOCA-KnowledgeBase/1.0)',
      },
      signal: AbortSignal.timeout(FETCH_MS),
    })
    if (!response.ok) return ''
    const contentType = response.headers.get('content-type') || ''
    if (/image|audio|video|font|octet-stream/i.test(contentType)) return ''
    return await response.text()
  } catch {
    return ''
  }
}

async function sitemapsFromRobots(origin) {
  const text = await fetchText(`${origin}/robots.txt`, 'text/plain,*/*;q=0.8')
  if (!text || /<html/i.test(text)) return []
  const urls = []
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*Sitemap:\s*(\S+)/i.exec(line)
    if (match?.[1]) urls.push(match[1].trim())
  }
  return urls
}

function isPageUrl(url) {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname.toLowerCase()
    if (
      /\.(jpe?g|png|gif|webp|svg|ico|bmp|mp4|webm|mov|mp3|wav|css|js|mjs|map|woff2?|ttf|eot|pdf|zip|rar)$/i.test(
        path,
      )
    ) {
      return false
    }
    if (/\/(content|css|js|scripts|assets|static|media|img|images|fonts|bundles)(\/|$)/i.test(path)) {
      return false
    }
    if (/css|javascript|flickity/i.test(path)) return false
    if (parsed.searchParams.has('v')) return false
    return true
  } catch {
    return false
  }
}

function originVariants(start) {
  const url = new URL(start)
  const host = url.hostname.replace(/^www\./i, '')
  const variants = new Set([url.origin])
  url.hostname = host
  variants.add(url.origin)
  url.hostname = `www.${host}`
  variants.add(url.origin)
  return [...variants]
}

async function harvestHtmlUrls(start) {
  const pageUrls = new Set([start])
  const toVisit = [start]
  const seenPages = new Set()

  while (toVisit.length > 0 && pageUrls.size < MAX_URLS && seenPages.size < MAX_HTML_PAGES) {
    const page = toVisit.shift()
    if (!page || seenPages.has(page)) continue
    seenPages.add(page)
    const html = await fetchText(page, 'text/html,application/xhtml+xml,*/*;q=0.8')
    if (!html || !/<a[\s>]/i.test(html)) continue

    for (const href of extractHrefs(html)) {
      let resolved = ''
      try {
        resolved = new URL(href, page).toString()
      } catch {
        continue
      }
      const normalized = normalizeHttpUrl(resolved)
      if (!normalized || !sameSite(start, normalized) || !isPageUrl(normalized)) continue
      if (pageUrls.has(normalized)) continue
      pageUrls.add(normalized)
      if (toVisit.length + seenPages.size < MAX_HTML_PAGES) toVisit.push(normalized)
      if (pageUrls.size >= MAX_URLS) break
    }
  }

  return pageUrls
}

export async function previewSitemapUrls(inputUrl) {
  const start = normalizeHttpUrl(inputUrl)
  if (!start) {
    throw Object.assign(new Error('Enter a valid website URL.'), { status: 400 })
  }

  const queue = []
  const seenSitemaps = new Set()
  const pageUrls = new Set()
  let fetches = 0

  const enqueue = (sitemapUrl, depth) => {
    const normalized = normalizeHttpUrl(sitemapUrl)
    if (!normalized || seenSitemaps.has(normalized) || depth > MAX_DEPTH) return
    seenSitemaps.add(normalized)
    queue.push({ url: normalized, depth })
  }

  for (const origin of originVariants(start)) {
    for (const sitemap of await sitemapsFromRobots(origin)) {
      enqueue(sitemap, 0)
    }
    enqueue(`${origin}/sitemap.xml`, 0)
    enqueue(`${origin}/sitemap_index.xml`, 0)
    enqueue(`${origin}/wp-sitemap.xml`, 0)
  }

  while (queue.length > 0 && pageUrls.size < MAX_URLS && fetches < MAX_SITEMAP_FETCHES) {
    const batch = queue.splice(0, BATCH_SIZE)
    await Promise.all(
      batch.map(async ({ url, depth }) => {
        if (pageUrls.size >= MAX_URLS || fetches >= MAX_SITEMAP_FETCHES) return
        fetches += 1
        const xml = await fetchText(url)
        if (!xml || !/<loc[\s>]/i.test(xml)) return
        const locs = extractLocs(xml)
        if (/<sitemapindex[\s>]/i.test(xml)) {
          for (const loc of locs) enqueue(loc, depth + 1)
          return
        }
        for (const loc of locs) {
          const page = normalizeHttpUrl(loc)
          if (page && isPageUrl(page)) pageUrls.add(page)
          if (pageUrls.size >= MAX_URLS) break
        }
      }),
    )
  }

  if (pageUrls.size > 0) {
    const urls = [...pageUrls].slice(0, MAX_URLS)
    return {
      urls,
      truncated: pageUrls.size > MAX_URLS,
    }
  }

  const harvested = await harvestHtmlUrls(start)
  if (harvested.size > 0) {
    const urls = [...harvested].slice(0, MAX_URLS)
    return {
      urls,
      harvested: true,
      warning:
        'No sitemap.xml found. Showing links from the site instead — pick the pages to add.',
    }
  }

  return {
    urls: [start],
    fallback: true,
    warning:
      'No sitemap or extra pages found. You can add the page you entered.',
  }
}
