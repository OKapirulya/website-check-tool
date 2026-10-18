import type { Finding } from '../types.js'
import { safeFetch } from '../lib/http.js'

export async function checkSitemapRobots(url: string): Promise<Finding[]> {
  const base = new URL(url)
  const findings: Finding[] = []

  const robotsUrl = new URL('/robots.txt', base.origin).toString()
  const robotsResponse = await safeFetch(robotsUrl, { redirect: 'manual' })

  findings.push({
    id: 'robots-txt',
    title: 'robots.txt',
    severity: 'low',
    passed: robotsResponse.status === 200,
    details: robotsResponse.status === 200
      ? 'robots.txt is present.'
      : 'No robots.txt found.',
  })

  const sitemapUrl = new URL('/sitemap.xml', base.origin).toString()
  const sitemapResponse = await safeFetch(sitemapUrl, { redirect: 'manual' })

  findings.push({
    id: 'sitemap-xml',
    title: 'sitemap.xml',
    severity: 'low',
    passed: sitemapResponse.status === 200,
    details: sitemapResponse.status === 200
      ? 'sitemap.xml is present.'
      : 'No sitemap.xml found.',
  })

  return findings
}
