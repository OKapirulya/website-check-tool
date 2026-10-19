import type { Finding } from '../types.js'
import { safeFetch, readTextLimited } from '../lib/http.js'

const COMMON_PATHS = ['/images/', '/uploads/', '/assets/', '/files/', '/backup/']
const MAX_BODY_BYTES = 200_000

export async function checkDirectoryListing(url: string): Promise<Finding[]> {
  const base = new URL(url)
  const exposed: string[] = []

  for (const path of COMMON_PATHS) {
    const target = new URL(path, base.origin).toString()

    try {
      const response = await safeFetch(target, { redirect: 'manual' })
      if (response.status !== 200) continue

      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('text/html')) continue

      const text = await readTextLimited(response, MAX_BODY_BYTES)
      if (/Index of \//i.test(text)) {
        exposed.push(path)
      }
    } catch {
      continue
    }
  }

  return [
    {
      id: 'directory-listing',
      title: 'Directory Listing',
      severity: 'medium',
      passed: exposed.length === 0,
      details:
        exposed.length === 0
          ? 'No open directory listings found at common paths.'
          : `Directory listing is enabled at: ${exposed.join(', ')}. This can expose file names that should not be public.`,
    },
  ]
}
