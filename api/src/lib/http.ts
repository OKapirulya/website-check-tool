import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const PRIVATE_IPV4_RANGES = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^0\./,
]

function isPrivateIPv4(ip: string): boolean {
  return PRIVATE_IPV4_RANGES.some((range) => range.test(ip))
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')
}

export class UrlValidationError extends Error { }

export async function validateTargetUrl(input: string): Promise<URL> {
  let parsed: URL
  try {
    parsed = new URL(input)
  } catch {
    throw new UrlValidationError('Invalid URL format.')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new UrlValidationError('Only http and https URLs are allowed.')
  }

  if (parsed.hostname === 'localhost') {
    throw new UrlValidationError('Scanning localhost is not allowed.')
  }

  if (isIP(parsed.hostname)) {
    const isPrivate = isIP(parsed.hostname) === 4
      ? isPrivateIPv4(parsed.hostname)
      : isPrivateIPv6(parsed.hostname)
    if (isPrivate) {
      throw new UrlValidationError('Scanning private or internal addresses is not allowed.')
    }
    return parsed
  }

  let address: string
  try {
    const result = await lookup(parsed.hostname)
    address = result.address
  } catch {
    throw new UrlValidationError('Could not resolve the target hostname.')
  }

  const isPrivate = isIP(address) === 4 ? isPrivateIPv4(address) : isPrivateIPv6(address)
  if (isPrivate) {
    throw new UrlValidationError('Target hostname resolves to a private or internal address.')
  }

  return parsed
}

const DEFAULT_TIMEOUT_MS = 5000

/** fetch() with a built-in timeout, used by every check that talks HTTP. */
export function safeFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const fetchPromise = fetch(url, {
    ...options,
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  })

  const backstop = new Promise<Response>((_, reject) => {
    setTimeout(() => reject(new Error('Request timed out')), DEFAULT_TIMEOUT_MS + 1000)
  })

  return Promise.race([fetchPromise, backstop])
}

export async function readTextLimited(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return ''

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let result = ''
  let received = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    received += value.byteLength
    if (received > maxBytes) {
      reader.cancel()
      break
    }

    result += decoder.decode(value, { stream: true })
  }

  return result
}

export function isPrivateAddress(hostname: string): boolean {
  const ipVersion = isIP(hostname)
  if (ipVersion === 4) return isPrivateIPv4(hostname)
  if (ipVersion === 6) return isPrivateIPv6(hostname)
  return false
}
