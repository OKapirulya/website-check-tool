import type { Finding } from '../types.js'
import { safeFetch, readTextLimited } from '../lib/http.js'

interface PathCheck {
  path: string
  label: string
  informational?: boolean
}

const PATHS: PathCheck[] = [
  { path: '/.git/config', label: 'Git configuration' },
  { path: '/.env', label: 'Environment file' },
  { path: '/.DS_Store', label: 'macOS folder metadata file' },
  { path: '/.htaccess', label: 'Apache configuration file' },
  { path: '/web.config', label: 'IIS configuration file' },
  { path: '/backup.zip', label: 'Backup archive' },
  { path: '/config.php.bak', label: 'Backed up configuration file' },
  { path: '/.well-known/security.txt', label: 'security.txt', informational: true },
]

const CONTROL_SAMPLE_BYTES = 2000

async function getControlBody(origin: string): Promise<string | null> {
  const randomPath = `/__wct_control_${Math.random().toString(36).slice(2)}__`
  try {
    const response = await safeFetch(new URL(randomPath, origin).toString(), { redirect: 'manual' })
    if (response.status !== 200) return null
    return await readTextLimited(response, CONTROL_SAMPLE_BYTES)
  } catch {
    return null
  }
}

export async function checkExposedPaths(url: string): Promise<Finding[]> {
  const base = new URL(url)
  const controlBody = await getControlBody(base.origin)

  return Promise.all(
    PATHS.map(async ({ path, label, informational }): Promise<Finding> => {
      const target = new URL(path, base.origin).toString()

      try {
        const response = await safeFetch(target, { redirect: 'manual' })
        let isExposed = response.status === 200

        if (isExposed && controlBody !== null) {
          const body = await readTextLimited(response, CONTROL_SAMPLE_BYTES)
          if (body === controlBody) {
            isExposed = false
          }
        }

        return {
          id: `exposed-${path}`,
          title: `Exposed path: ${path}`,
          severity: informational ? 'low' : 'high',
          passed: informational ? isExposed : !isExposed,
          details: informational
            ? isExposed
              ? `${label} found at ${path}.`
              : `No ${label} found at ${path}. Consider adding one.`
            : isExposed
              ? `${label} is publicly accessible at ${path}. This can expose sensitive data.`
              : `${path} is not accessible.`,
        }
      } catch {
        return {
          id: `exposed-${path}`,
          title: `Exposed path: ${path}`,
          severity: 'low',
          passed: false,
          details: `Could not reach ${path} (connection error or timeout).`,
        }
      }
    })
  )
}