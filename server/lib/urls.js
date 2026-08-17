export function normalizeHttpUrl(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed || trimmed.startsWith('#') || /^(mailto|tel|javascript):/i.test(trimmed)) {
    return ''
  }

  if (hasNonHttpScheme(trimmed)) return ''

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : trimmed.startsWith('//')
      ? `https:${trimmed}`
      : `https://${trimmed}`

  try {
    const parsed = new URL(withProtocol)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
    if (parsed.username || parsed.password) return ''
    if (isBlockedHost(parsed.hostname)) return ''
    if (!isPlausibleHost(parsed.hostname)) return ''
    parsed.hash = ''
    return parsed.toString()
  } catch {
    return ''
  }
}

function hasNonHttpScheme(value) {
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(value)
  if (!match) return false
  const scheme = match[1].toLowerCase()
  return scheme !== 'http' && scheme !== 'https'
}

function isPlausibleHost(hostname) {
  const host = String(hostname || '')
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
  if (!host || host === '.' || host.includes(' ')) return false
  if (host === 'localhost') return false
  if (!host.includes('.')) return false
  return true
}

export function isBlockedHost(hostname) {
  const host = String(hostname || '')
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost')
  ) {
    return true
  }
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (!ipv4) return false
  const [a, b] = [Number(ipv4[1]), Number(ipv4[2])]
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  )
}

export function sameSite(originUrl, candidateUrl) {
  try {
    const a = stripWww(new URL(originUrl).hostname)
    const b = stripWww(new URL(candidateUrl).hostname)
    return Boolean(a && a === b)
  } catch {
    return false
  }
}

function stripWww(hostname) {
  return String(hostname || '')
    .toLowerCase()
    .replace(/^www\./, '')
}

export function clientError(message, status = 400) {
  const error = new Error(message)
  error.status = status
  return error
}
