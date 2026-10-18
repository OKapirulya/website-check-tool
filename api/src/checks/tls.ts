import { connect } from 'node:tls'
import type { Finding } from '../types.js'

export function checkTls(url: string): Promise<Finding[]> {
  return new Promise((resolve) => {
    const { hostname } = new URL(url)

    const socket = connect(
      { host: hostname, port: 443, servername: hostname },
      () => {
        const cert = socket.getPeerCertificate()
        const protocol = socket.getProtocol()

        const findings: Finding[] = []

        if (!cert || Object.keys(cert).length === 0) {
          findings.push({
            id: 'tls-cert',
            title: 'TLS Certificate',
            severity: 'high',
            passed: false,
            details: 'Could not read certificate details.',
          })
        } else {
          const expiryDate = new Date(cert.valid_to)
          const daysUntilExpiry = Math.floor(
            (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
          const expiringSoon = daysUntilExpiry < 14

          findings.push({
            id: 'tls-cert-expiry',
            title: 'TLS Certificate Expiry',
            severity: 'high',
            passed: daysUntilExpiry > 0 && !expiringSoon,
            details: daysUntilExpiry <= 0
              ? 'TLS certificate has expired.'
              : expiringSoon
                ? `TLS certificate expires in ${daysUntilExpiry} days.`
                : `TLS certificate is valid until ${cert.valid_to}.`,
          })
        }

        const outdatedProtocols = ['TLSv1', 'TLSv1.1']
        findings.push({
          id: 'tls-protocol',
          title: 'TLS Protocol Version',
          severity: 'high',
          passed: protocol ? !outdatedProtocols.includes(protocol) : false,
          details: protocol
            ? `Connection uses ${protocol}.`
            : 'Could not determine TLS protocol version.',
        })

        socket.end()
        resolve(findings)
      }
    )

    socket.setTimeout(5000, () => {
      socket.destroy()
      resolve([{
        id: 'tls-cert',
        title: 'TLS Certificate',
        severity: 'high',
        passed: false,
        details: 'Connection timed out while checking the TLS certificate.',
      }])
    })

    socket.on('error', () => {
      resolve([{
        id: 'tls-cert',
        title: 'TLS Certificate',
        severity: 'high',
        passed: false,
        details: 'Could not establish a TLS connection.',
      }])
    })
  })
}
