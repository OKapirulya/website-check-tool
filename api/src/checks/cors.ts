import type { Finding } from '../types.js'

export async function checkCors(url: string): Promise<Finding[]> {
  const response = await fetch(url, { redirect: 'follow' })
  const allowOrigin = response.headers.get('access-control-allow-origin')
  const allowCredentials = response.headers.get('access-control-allow-credentials')

  const misconfigured = allowOrigin === '*' && allowCredentials === 'true'

  return [{
    id: 'cors',
    title: 'CORS Configuration',
    severity: 'high',
    passed: !misconfigured,
    details: misconfigured
      ? 'CORS allows any origin (*) together with credentials. This can let malicious sites read authenticated responses.'
      : 'No dangerous CORS misconfiguration detected on this response.',
  }]
}
