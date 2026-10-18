import type { Finding } from '../types.js'

export async function checkMixedContent(url: string): Promise<Finding[]> {
  const response = await fetch(url, { redirect: 'follow' })
  const html = await response.text()

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
