import type { Finding } from '../types.js'
import { safeFetch, readTextLimited } from '../lib/http.js'

const COMMON_PATHS = ['/images/', '/uploads/', '/assets/', '/files/', '/backup/']
const MAX_BODY_BYTES = 200_000

interface PathResult {
  path: string
  listed: boolean
}

export async function checkDirectoryListing(url: string): Promise<Finding[]> {
  const base = new URL(url)

  const results = await Promise.allSettled(
    COMMON_PATHS.map(async (path): Promise<PathResult> => {
      const target = new URL(path, base.origin).toString()
      const response = await safeFetch(target, { redirect: 'manual' })

      if (response.status !== 200) return { path, listed: false }

      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('text/html')) return { path, listed: false }

      const text = await readTextLimited(response, MAX_BODY_BYTES)
      return { path, listed: /Index of \//i.test(text) }
    })
  )

  const reachable = results.filter(
    (r): r is PromiseFulfilledResult<PathResult> => r.status === 'fulfilled'
  )

  if (reachable.length === 0) {
    return [
      {
        id: 'directory-listing',
        title: 'Directory Listing',
        severity: 'low',
        passed: false,
        details: 'Could not reach the target to check for directory listings (connection error or timeout).',
      },
    ]
  }

  const exposed = reachable.filter((r) => r.value.listed).map((r) => r.value.path)

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