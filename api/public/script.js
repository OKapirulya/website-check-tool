const form = document.getElementById('scan-form')
const input = document.getElementById('url-input')
const statusEl = document.getElementById('status')
const resultsEl = document.getElementById('results')

const aiSection = document.getElementById('ai-section')
const explainButton = document.getElementById('explain-button')
const aiStatusEl = document.getElementById('ai-status')
const aiExplanationEl = document.getElementById('ai-explanation')

const a11ySection = document.getElementById('a11y-section')
const a11yButton = document.getElementById('a11y-button')
const a11yStatusEl = document.getElementById('a11y-status')
const a11yResultsEl = document.getElementById('a11y-results')

let accessibilityEnabled = false

fetch('/health')
  .then((res) => res.json())
  .then((data) => {
    accessibilityEnabled = Boolean(data.accessibilityEnabled)
  })
  .catch(() => { })

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
  a11ySection.hidden = true
  a11yResultsEl.innerHTML = ''
  a11yStatusEl.textContent = ''
  setStatus('Scanning...', 'loading')

  try {
    const response = await fetch(`/check?url=${encodeURIComponent(url)}`)
    const data = await response.json()

    if (!response.ok) {
      setStatus(data.error ?? 'Scan failed.', 'error')
      return
    }

    setStatus(`Scanned ${data.url}`, 'done')
    renderFindings(resultsEl, data.findings)

    currentUrl = data.url
    explainButton.disabled = false
    aiSection.hidden = false
    if (accessibilityEnabled) {
      a11yButton.disabled = false
      a11ySection.hidden = false
    }
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

a11yButton.addEventListener('click', async () => {
  if (!currentUrl) return

  a11yButton.disabled = true
  a11yResultsEl.innerHTML = ''
  a11yStatusEl.textContent = 'Loading the page in a headless browser, this can take up to 15 seconds...'
  a11yStatusEl.className = 'status status-loading'

  try {
    const response = await fetch(`/accessibility?url=${encodeURIComponent(currentUrl)}`)
    const data = await response.json()

    if (!response.ok) {
      a11yStatusEl.textContent = data.error ?? 'Accessibility check failed.'
      a11yStatusEl.className = 'status status-error'
      return
    }

    a11yStatusEl.textContent = ''
    renderFindings(a11yResultsEl, data.findings)
  } catch {
    a11yStatusEl.textContent = 'Could not reach the accessibility check service.'
    a11yStatusEl.className = 'status status-error'
  } finally {
    a11yButton.disabled = false
  }
})

function setStatus(text, state) {
  statusEl.textContent = text
  statusEl.className = `status status-${state}`
}

function renderFindings(container, findings) {
  container.innerHTML = ''

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

    container.appendChild(section)
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