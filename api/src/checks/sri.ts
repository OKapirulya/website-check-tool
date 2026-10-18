import type { Finding } from '../types.js'
import { safeFetch, readTextLimited } from '../lib/http.js'

const MAX_BODY_BYTES = 2_000_000 // 2 MB

export async function checkSri(url: string): Promise<Finding[]> {
  const base = new URL(url)
  const response = await safeFetch(url, { redirect: 'follow' })
  const html = await readTextLimited(response, MAX_BODY_BYTES)

  const tagRegex = /<(script|link)[^>]+(?:src|href)=["']([^"']+)["'][^>]*>/gi
  const missing = new Set<string>()
  let match: RegExpExecArray | null

  while ((match = tagRegex.exec(html)) !== null) {
    const [fullTag, tagName, resourceUrl] = match

    let isExternal = false
    try {
      const resolved = new URL(resourceUrl, base)
      isExternal = resolved.origin !== base.origin
    } catch {
      continue
    }

    if (!isExternal) continue
    if (tagName === 'link' && !fullTag.includes('stylesheet')) continue
    if (fullTag.includes('integrity=')) continue

    missing.add(resourceUrl)
  }

  if (missing.size === 0) {
    return [{
      id: 'sri',
      title: 'Subresource Integrity',
      severity: 'medium',
      passed: true,
      details: 'All external scripts and stylesheets have an integrity attribute.',
    }]
  }

  const examples = [...missing].slice(0, 5)

  return [{
    id: 'sri',
    title: 'Subresource Integrity',
    severity: 'medium',
    passed: false,
    details: `${missing.size} external resource(s) missing a Subresource Integrity hash. Examples: ${examples.join(', ')}${missing.size > examples.length ? ', ...' : ''}`,
  }]
}