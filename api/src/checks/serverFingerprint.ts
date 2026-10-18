import type { Finding } from '../types.js'

export async function checkServerFingerprint(url: string): Promise<Finding[]> {
  const response = await fetch(url, { redirect: 'follow' })
  const server = response.headers.get('server')
  const poweredBy = response.headers.get('x-powered-by')

  const exposed = [server, poweredBy].filter(Boolean)

  return [{
    id: 'server-fingerprint',
    title: 'Server Fingerprinting',
    severity: 'low',
    passed: exposed.length === 0,
    details: exposed.length === 0
      ? 'No Server or X-Powered-By header revealing software details.'
      : `Server reveals technology details: ${exposed.join(', ')}. This can help attackers target known vulnerabilities.`,
  }]
}
