import type { Finding } from '../types.js'
import { safeFetch, readTextLimited } from '../lib/http.js'

const MAX_BODY_BYTES = 2_000_000 // 2 MB

export async function checkMixedContent(url: string): Promise<Finding[]> {
  const response = await safeFetch(url, { redirect: 'follow' })
  const html = await readTextLimited(response, MAX_BODY_BYTES)

  const httpResourceRegex = /(?:src|href)=["']http:\/\/[^"']+["']/gi
  const matches = html.match(httpResourceRegex) ?? []

  return [{
    id: 'mixed-content',
    title: 'Mixed Content',
    severity: 'medium',
    passed: matches.length === 0,
    details: matches.length === 0
      ? 'No insecure http:// resources found in the page HTML.'
      : `Found ${matches.length} resource(s) loaded over insecure http://.`,
  }]
}