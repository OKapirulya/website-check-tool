import type { Finding } from '../types.js'
import { safeFetch } from '../lib/http.js'

const SENSITIVE_PATHS = [
  { path: '/.git/config', label: 'Git configuration' },
  { path: '/.env', label: 'Environment file' },
  { path: '/.well-known/security.txt', label: 'security.txt (informational, not a leak)' },
]

export async function checkExposedPaths(url: string): Promise<Finding[]> {
  const base = new URL(url)
  const findings: Finding[] = []

  for (const { path, label } of SENSITIVE_PATHS) {
    const target = new URL(path, base.origin).toString()

    try {
      const response = await safeFetch(target, { redirect: 'manual' })
      const isExposed = response.status === 200
      const isSecurityTxt = path.includes('security.txt')

      findings.push({
        id: `exposed-${path}`,
        title: `Exposed path: ${path}`,
        severity: isSecurityTxt ? 'low' : 'high',
        passed: isSecurityTxt ? isExposed : !isExposed,
        details: isSecurityTxt
          ? (isExposed
              ? `${label} found at ${path}.`
              : `No security.txt found. Consider adding one (RFC 9116).`)
          : (isExposed
              ? `${label} is publicly accessible at ${path}. This can expose sensitive data.`
              : `${path} is not accessible.`),
      })
    } catch {
      findings.push({
        id: `exposed-${path}`,
        title: `Exposed path: ${path}`,
        severity: 'low',
        passed: true,
        details: `Could not reach ${path} (connection error).`,
      })
    }
  }

  return findings
}
