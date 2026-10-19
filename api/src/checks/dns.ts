import { resolveTxt, resolveCaa } from 'node:dns/promises'
import type { Finding } from '../types.js'

export async function checkDns(url: string): Promise<Finding[]> {
  const { hostname } = new URL(url)
  const findings: Finding[] = []

  findings.push(await checkSpf(hostname))
  findings.push(await checkDmarc(hostname))
  findings.push(await checkCaa(hostname))

  return findings
}

async function checkSpf(hostname: string): Promise<Finding> {
  try {
    const records = await resolveTxt(hostname)
    const hasSpf = records.some((r) => r.join('').startsWith('v=spf1'))

    return {
      id: 'spf',
      title: 'SPF Record',
      severity: 'low',
      passed: hasSpf,
      details: hasSpf
        ? 'SPF record found.'
        : 'No SPF record found. This makes it easier for attackers to spoof emails from this domain.',
    }
  } catch {
    return {
      id: 'spf',
      title: 'SPF Record',
      severity: 'low',
      passed: false,
      details: 'No SPF record found. This makes it easier for attackers to spoof emails from this domain.',
    }
  }
}

async function checkDmarc(hostname: string): Promise<Finding> {
  try {
    const records = await resolveTxt(`_dmarc.${hostname}`)
    const hasDmarc = records.some((r) => r.join('').startsWith('v=DMARC1'))

    return {
      id: 'dmarc',
      title: 'DMARC Record',
      severity: 'low',
      passed: hasDmarc,
      details: hasDmarc
        ? 'DMARC record found.'
        : 'No DMARC record found. This weakens protection against email spoofing.',
    }
  } catch {
    return {
      id: 'dmarc',
      title: 'DMARC Record',
      severity: 'low',
      passed: false,
      details: 'No DMARC record found. This weakens protection against email spoofing.',
    }
  }
}

async function checkCaa(hostname: string): Promise<Finding> {
  try {
    const records = await resolveCaa(hostname)
    const hasCaa = records.length > 0
    const issuers = [
      ...new Set(
        records
          .map((record) => record.issue ?? record.issuewild)
          .filter((value): value is string => Boolean(value))
      ),
    ]

    return {
      id: 'caa',
      title: 'CAA Record',
      severity: 'low',
      passed: hasCaa,
      details: hasCaa
        ? `CAA record found${issuers.length > 0 ? `, restricting certificate issuance to: ${issuers.join(', ')}.` : '.'}`
        : 'No CAA record found. Any certificate authority can issue certificates for this domain.',
    }
  } catch {
    return {
      id: 'caa',
      title: 'CAA Record',
      severity: 'low',
      passed: false,
      details: 'No CAA record found. Any certificate authority can issue certificates for this domain.',
    }
  }
}