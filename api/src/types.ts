export type Severity = 'low' | 'medium' | 'high'

export interface Finding {
  id: string
  title: string
  severity: Severity
  passed: boolean
  details: string
}