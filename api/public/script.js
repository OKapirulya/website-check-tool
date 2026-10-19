const form = document.getElementById('scan-form')
const input = document.getElementById('url-input')
const statusEl = document.getElementById('status')
const resultsEl = document.getElementById('results')

const aiSection = document.getElementById('ai-section')
const explainButton = document.getElementById('explain-button')
const aiStatusEl = document.getElementById('ai-status')
const aiExplanationEl = document.getElementById('ai-explanation')

let currentUrl = null

const SEVERITY_ORDER = ['high', 'medium', 'low']
const SEVERITY_LABELS = {
  high: 'High severity',
  medium: 'Medium severity',
  low: 'Low severity',
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()

  const url = input.value.trim()
  if (!url) return

  resultsEl.innerHTML = ''
  aiSection.hidden = true
  aiExplanationEl.textContent = ''
  aiStatusEl.textContent = ''
  setStatus('Scanning...', 'loading')

  try {
    const response = await fetch(`/check?url=${encodeURIComponent(url)}`)
    const data = await response.json()

    if (!response.ok) {
      setStatus(data.error ?? 'Scan failed.', 'error')
      return
    }

    setStatus(`Scanned ${data.url}`, 'done')
    renderFindings(data.findings)

    currentUrl = data.url
    explainButton.disabled = false
    aiSection.hidden = false
  } catch {
    setStatus('Could not reach the scanner.', 'error')
  }
})

explainButton.addEventListener('click', async () => {
  if (!currentUrl) return

  explainButton.disabled = true
  aiExplanationEl.textContent = ''
  aiStatusEl.textContent = 'Asking Claude for an explanation...'
  aiStatusEl.className = 'status status-loading'

  try {
    const response = await fetch(`/explain?url=${encodeURIComponent(currentUrl)}`)
    const data = await response.json()

    if (!response.ok) {
      aiStatusEl.textContent = data.error ?? 'Could not generate an explanation.'
      aiStatusEl.className = 'status status-error'
      explainButton.disabled = false
      return
    }

    aiStatusEl.textContent = ''
    aiExplanationEl.textContent = data.explanation
  } catch {
    aiStatusEl.textContent = 'Could not reach the explanation service.'
    aiStatusEl.className = 'status status-error'
    explainButton.disabled = false
  }
})

function setStatus(text, state) {
  statusEl.textContent = text
  statusEl.className = `status status-${state}`
}

function renderFindings(findings) {
  resultsEl.innerHTML = ''

  for (const severity of SEVERITY_ORDER) {
    const group = findings.filter((finding) => finding.severity === severity)
    if (group.length === 0) continue

    const section = document.createElement('section')
    section.className = 'severity-group'

    const heading = document.createElement('h2')
    heading.textContent = SEVERITY_LABELS[severity]
    section.appendChild(heading)

    for (const finding of group) {
      section.appendChild(renderFinding(finding))
    }

    resultsEl.appendChild(section)
  }
}

function renderFinding(finding) {
  const item = document.createElement('article')
  item.className = `finding finding-${finding.passed ? 'pass' : 'fail'}`

  const header = document.createElement('div')
  header.className = 'finding-header'

  const title = document.createElement('span')
  title.className = 'finding-title'
  title.textContent = finding.title

  const badge = document.createElement('span')
  badge.className = `badge badge-${finding.passed ? 'pass' : 'fail'}`
  badge.textContent = finding.passed ? 'Pass' : 'Fail'

  header.appendChild(title)
  header.appendChild(badge)

  const details = document.createElement('p')
  details.className = 'finding-details'
  details.textContent = finding.details

  item.appendChild(header)
  item.appendChild(details)

  return item
}