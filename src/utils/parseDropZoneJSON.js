import {
  normaliseTaskType,
  PRIORITY_SET,
  DEFAULT_PRIORITY,
} from '../data/taskMetadata.js'

const TASKLANE_PRIORITIES = new Set(['Low', 'Medium', 'High', 'Critical'])
const THINGS_PRIORITIES = new Set(['high', 'medium', 'low'])
const SOURCE_SET = new Set(['Email', 'Teams', 'Meeting', 'Other'])

const TITLE_KEYS = [
  'title',
  'name',
  'subject',
  'summary',
  'taskTitle',
  'TaskTitle',
  'task_name',
]

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `dz-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function stripBom(s) {
  return String(s ?? '').replace(/^\uFEFF/, '')
}

function normaliseCommonJsonEscapes(input) {
  return String(input ?? '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\\\[/g, '[')
    .replace(/\\\]/g, ']')
    .replace(/\\\{/g, '{')
    .replace(/\\\}/g, '}')
    .replace(/,\s*([}\]])/g, '$1')
    .trim()
}

function stripMarkdownFences(text) {
  let t = String(text ?? '').trim()
  const full = t.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/im)
  if (full) return full[1].trim()
  const idx = t.indexOf('```')
  if (idx !== -1) {
    let rest = t.slice(idx + 3).replace(/^\s*(?:json)?\s*\n?/i, '')
    const end = rest.indexOf('```')
    if (end !== -1) return rest.slice(0, end).trim()
  }
  return t
}

function extractLikelyJson(text) {
  const t = text.trim()
  const firstBrace = t.indexOf('{')
  const firstBracket = t.indexOf('[')
  if (firstBracket >= 0 && (firstBrace < 0 || firstBracket < firstBrace)) {
    const last = t.lastIndexOf(']')
    if (last > firstBracket) return t.slice(firstBracket, last + 1).trim()
  }
  if (firstBrace >= 0) {
    const last = t.lastIndexOf('}')
    if (last > firstBrace) return t.slice(firstBrace, last + 1).trim()
  }
  return t
}

function tryJsonParseCandidates(rawInput) {
  const chain = [
    rawInput,
    stripMarkdownFences(rawInput),
    extractLikelyJson(stripMarkdownFences(rawInput)),
    normaliseCommonJsonEscapes(extractLikelyJson(stripMarkdownFences(rawInput))),
    extractLikelyJson(rawInput),
    normaliseCommonJsonEscapes(extractLikelyJson(rawInput)),
  ]
  const seen = new Set()
  for (const c of chain) {
    if (!c || seen.has(c)) continue
    seen.add(c)
    try {
      return JSON.parse(c)
    } catch {
      // continue
    }
  }
  return null
}

function extractTitle(row) {
  if (!row || typeof row !== 'object') return ''
  for (const k of TITLE_KEYS) {
    const t = String(row[k] ?? '').trim()
    if (t) return t
  }
  return ''
}

function rowHasTasklaneKeys(row) {
  return row && typeof row === 'object' && 'taskType' in row && 'owner' in row
}

function priorityMatchesTasklane(p) {
  if (p === undefined || p === null || p === '') return true
  const s = String(p).trim()
  return TASKLANE_PRIORITIES.has(s)
}

function noTaskTypeField(row) {
  return row && typeof row === 'object' && !('taskType' in row)
}

function priorityMatchesThings(p) {
  if (p === undefined || p === null || p === '') return true
  return THINGS_PRIORITIES.has(String(p).trim().toLowerCase())
}

function detectFormat(rawList) {
  if (!rawList.length) return 'unknown'
  const allLaneKeys = rawList.every(rowHasTasklaneKeys)
  const allLanePri = rawList.every((row) => priorityMatchesTasklane(row?.priority))
  if (allLaneKeys && allLanePri) return 'tasklane'

  const allNoTaskType = rawList.every(noTaskTypeField)
  const allThingsPri = rawList.every((row) => priorityMatchesThings(row?.priority))
  if (allNoTaskType && allThingsPri) return 'things'

  return 'unknown'
}

function normaliseDueDate(raw) {
  const t = String(raw ?? '').trim()
  if (!t) return ''
  if (DATE_RE.test(t)) return t
  return ''
}

function normaliseSource(raw, detectedFormat) {
  const s = String(raw ?? '').trim()
  if (!s) return 'Other'
  if (detectedFormat === 'things') {
    const lower = s.toLowerCase()
    const map = {
      email: 'Email',
      teams: 'Teams',
      meeting: 'Meeting',
      other: 'Other',
    }
    if (map[lower]) return map[lower]
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
  }
  if (SOURCE_SET.has(s)) return s
  return 'Other'
}

function mapThingsPriorityToInternal(raw) {
  const pl = String(raw ?? '').trim().toLowerCase()
  if (pl === 'high') return 'High'
  if (pl === 'low') return 'Low'
  if (pl === 'medium' || pl === '') return 'Medium'
  return 'Medium'
}

function mapTasklaneOrUnknownPriority(raw) {
  if (raw === undefined || raw === null || raw === '') return DEFAULT_PRIORITY
  const t = String(raw).trim()
  if (PRIORITY_SET.has(t)) return t
  const tl = t.toLowerCase()
  if (tl === 'high') return 'High'
  if (tl === 'low') return 'Low'
  if (tl === 'medium') return 'Medium'
  if (tl === 'critical') return 'Critical'
  return DEFAULT_PRIORITY
}

function buildNormalisedTask(row, detectedFormat) {
  const title = extractTitle(row)
  if (!title) return null

  const description = String(row.description ?? '').trim()

  let priority
  if (detectedFormat === 'things') {
    priority = mapThingsPriorityToInternal(row.priority)
  } else {
    priority = mapTasklaneOrUnknownPriority(row.priority)
  }

  const taskType = normaliseTaskType(
    detectedFormat === 'things' ? '' : String(row.taskType ?? ''),
    'Execution'
  )

  const owner =
    detectedFormat === 'things'
      ? ''
      : String(row.owner ?? '').trim()

  const dueDate = normaliseDueDate(row.dueDate)
  const source = normaliseSource(row.source, detectedFormat)

  return {
    id: newId(),
    title,
    description,
    priority,
    taskType,
    owner,
    dueDate,
    source,
    selected: true,
  }
}

/**
 * Canonical parser for Copilot / Things JSON used by Drop Zone and the Board import modal.
 * @param {string} input
 * @returns {{ tasks: Array<object>, detectedFormat: 'tasklane' | 'things' | 'unknown', errors: string[] }}
 */
export function parseDropZoneJSON(input) {
  const errors = []
  let raw = stripBom(String(input ?? '').trim())
  if (!raw.length) {
    errors.push('Empty input.')
    return { tasks: [], detectedFormat: 'unknown', errors }
  }

  const parsed = tryJsonParseCandidates(raw)
  if (parsed === null) {
    errors.push(
      'Invalid JSON — check the output from Copilot and try again.'
    )
    return { tasks: [], detectedFormat: 'unknown', errors }
  }

  let rawList = null
  if (Array.isArray(parsed)) rawList = parsed
  else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.tasks)) {
    rawList = parsed.tasks
  } else {
    errors.push('Expected a JSON array or an object with a tasks array.')
    return { tasks: [], detectedFormat: 'unknown', errors }
  }

  if (!rawList.length) {
    errors.push('No tasks in JSON.')
    return { tasks: [], detectedFormat: 'unknown', errors }
  }

  const objectRows = rawList.filter((r) => r && typeof r === 'object')
  if (!objectRows.length) {
    errors.push('No valid tasks found.')
    return { tasks: [], detectedFormat: 'unknown', errors }
  }

  const detectedFormat = detectFormat(objectRows)
  const tasks = []
  for (const row of objectRows) {
    const t = buildNormalisedTask(row, detectedFormat)
    if (t) tasks.push(t)
  }

  if (!tasks.length) {
    errors.push('No valid tasks found.')
    return { tasks: [], detectedFormat: 'unknown', errors }
  }

  return { tasks, detectedFormat, errors: [] }
}
