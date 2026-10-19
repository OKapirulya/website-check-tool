import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import type { Finding } from '../types.js'
import { isPrivateAddress } from '../lib/http.js'

const NAVIGATION_TIMEOUT_MS = 10_000
const OVERALL_TIMEOUT_MS = 20_000

export async function checkAccessibility(url: string): Promise<Finding[]> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const context = await browser.newContext()
    const page = await context.newPage()

    page.setDefaultTimeout(NAVIGATION_TIMEOUT_MS)
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS)

    await page.route('**/*', (route) => {
      const requestUrl = new URL(route.request().url())
      if (requestUrl.hostname === 'localhost' || isPrivateAddress(requestUrl.hostname)) {
        return route.abort()
      }
      return route.continue()
    })

    await withTimeout(
      page.goto(url, { waitUntil: 'load' }),
      OVERALL_TIMEOUT_MS,
      'Page load timed out'
    )

    const results = await new AxeBuilder({ page }).analyze()

    if (results.violations.length === 0) {
      return [
        {
          id: 'accessibility',
          title: 'Accessibility (WCAG)',
          severity: 'medium',
          passed: true,
          details: 'No automated accessibility violations detected.',
        },
      ]
    }

    return results.violations.map((violation) => ({
      id: `a11y-${violation.id}`,
      title: `Accessibility: ${violation.help}`,
      severity: mapImpact(violation.impact),
      passed: false,
      details: `${violation.description} Affects ${violation.nodes.length} element(s).`,
    }))
  } finally {
    await browser.close()
  }
}

function mapImpact(impact: string | null | undefined): Finding['severity'] {
  switch (impact) {
    case 'critical':
    case 'serious':
      return 'high'
    case 'moderate':
      return 'medium'
    default:
      return 'low'
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ])
}
