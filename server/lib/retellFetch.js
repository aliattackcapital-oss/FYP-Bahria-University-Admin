function retriableNetworkError(error) {
  const code = error?.cause?.code
  return (
    code === 'ENOTFOUND' ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'EAI_AGAIN' ||
    error?.name === 'AbortError'
  )
}

function networkErrorMessage(error) {
  const code = error?.cause?.code
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return 'Could not reach Retell (api.retellai.com). Check your internet connection and retry.'
  }
  if (error?.name === 'AbortError') {
    return 'Retell API timed out. Please retry.'
  }
  return error?.message || 'Retell API request failed'
}

/** Fetch with timeout and retries for transient DNS/network failures. */
export async function fetchRetell(url, options = {}, { attempts = 3, timeoutMs = 30_000 } = {}) {
  let lastError
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, {
        ...options,
        signal: options.signal ?? controller.signal,
      })
      clearTimeout(timer)
      return response
    } catch (error) {
      clearTimeout(timer)
      lastError = error
      if (!retriableNetworkError(error) || attempt === attempts - 1) break
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)))
    }
  }
  throw new Error(networkErrorMessage(lastError), { cause: lastError })
}