import {
  normaliseTaskType,
  PRIORITY_SET,
  TASK_TYPES,
  DEFAULT_PRIORITY,
  DEFAULT_TASK_TYPE,
} from '../data/taskMetadata'

const TITLE_MAX = 120
const DESCRIPTION_MAX = 1000

const SOURCE_SET = new Set(['Email', 'Teams', 'Meeting', 'Other'])

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function stripMarkdownCodeFence(input) {
  const text = String(input ?? '').trim()
  const match = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return match ? match[1].trim() : text
}

function extractLikelyJsonObject(input) {
  const text = String(input ?? '')
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first >= 0 && last > first) {
    return text.slice(first, last + 1).trim()
  }
  return text.trim()
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

function parseJsonWithFallbacks(input) {
  const raw = String(input ?? '').trim()
  const candidates = [{ value: raw, cleaned: false }]

  const noFence = stripMarkdownCodeFence(raw)
  if (noFence && noFence !== raw) candidates.push({ value: noFence, cleaned: true })

  const extracted = extractLikelyJsonObject(noFence || raw)
  if (extracted && extracted !== (noFence || raw)) {
    candidates.push({ value: extracted, cleaned: true })
  }

  const cleaned = normaliseCommonJsonEscapes(extracted || noFence || raw)
  if (cleaned && cleaned !== (extracted || noFence || raw)) {
    candidates.push({ value: cleaned, cleaned: true })
  }

  for (const candidate of candidates) {
    if (!candidate.value) continue
    try {
      return { parsed: JSON.parse(candidate.value), cleaned: candidate.cleaned }
    } catch {
      // try next candidate
    }
  }
  return { parsed: null, cleaned: false }
}

function truncateDescription(s, warnings, rowLabel) {
  if (s.length <= DESCRIPTION_MAX) return s
  warnings.push(`${rowLabel} Description truncated to ${DESCRIPTION_MAX} characters.`)
  return s.slice(0, DESCRIPTION_MAX)
}

function normaliseDueDate(raw, warnings, rowLabel) {
  const t = String(raw ?? '').trim()
  if (!t) return ''
  if (DATE_RE.test(t)) return t
  warnings.push(`${rowLabel} Invalid dueDate ignored (use YYYY-MM-DD or omit).`)
  return ''
}

function normaliseSource(raw, warnings, rowLabel) {
  const t = String(raw ?? '').trim()
  if (!t) return 'Other'
  if (SOURCE_SET.has(t)) return t
  warnings.push(`${rowLabel} Unknown source replaced with Other.`)
  return 'Other'
}

function normalisePriority(raw, warnings, rowLabel) {
  if (raw === undefined || raw === null || raw === '')
    return DEFAULT_PRIORITY
  const t =
    typeof raw === 'string' ? raw.trim() : String(raw).trim()
  if (!t) return DEFAULT_PRIORITY
  if (PRIORITY_SET.has(t)) return t
  warnings.push(`${rowLabel} Unknown priority defaulted to Medium.`)
  return DEFAULT_PRIORITY
}

function normaliseImportTaskType(raw, warnings, rowLabel) {
  const t = typeof raw === 'string' ? raw.trim() : ''
  if (!t) return normaliseTaskType('', DEFAULT_TASK_TYPE)
  const mapped = normaliseTaskType(t, DEFAULT_TASK_TYPE)
  if (TASK_TYPES.includes(t) || t === 'Migration' || t === 'Day 2') return mapped
  warnings.push(`${rowLabel} Unknown task type defaulted to Discovery.`)
  return mapped
}

/**
 * @param {string} input Raw pasted JSON string
 * @returns {{ tasks: Array<{title: string, description: string, priority: string, taskType: string, owner: string, dueDate: string, source: string}>, warnings: string[] }}
 */
export function parseTaskImport(input) {
  const warnings = []
  const tasks = []

  const text = typeof input === 'string' ? input.trim() : ''
  if (!text.length) {
    warnings.push('No input pasted.')
    return { tasks: [], warnings }
  }

  const { parsed, cleaned } = parseJsonWithFallbacks(text)
  if (!parsed) {
    warnings.push(
      'Invalid JSON. Paste Copilot output using the expected JSON format.'
    )
    return { tasks: [], warnings }
  }
  if (cleaned) {
    warnings.push(
      'Input was cleaned before parsing. Review the preview before creating tasks.'
    )
  }

  if (!parsed || typeof parsed !== 'object') {
    warnings.push('Expected a JSON object with a tasks array.')
    return { tasks: [], warnings }
  }

  if (!('tasks' in parsed)) {
    warnings.push('JSON must contain a top-level tasks array.')
    return { tasks: [], warnings }
  }

  const rawList = parsed.tasks
  if (!Array.isArray(rawList)) {
    warnings.push('The tasks field must be an array.')
    return { tasks: [], warnings }
  }

  rawList.forEach((row, i) => {
    const rowLabel = `Row ${i + 1}:`
    if (!row || typeof row !== 'object') {
      warnings.push(`${rowLabel} Skipped (not an object).`)
      return
    }

    let titleRaw = String(row.title ?? '').trim()
    if (!titleRaw) {
      warnings.push(`${rowLabel} Skipped (title is empty).`)
      return
    }

    let extraFromTitle = ''
    if (titleRaw.length > TITLE_MAX) {
      const fullTitle = titleRaw
      titleRaw = fullTitle.slice(0, TITLE_MAX)
      extraFromTitle = `\n\n[Full original title]\n${fullTitle}`
      warnings.push(
        `${rowLabel} Title shortened to ${TITLE_MAX} characters; full title appended to description.`
      )
    }

    let description = String(row.description ?? '').trim() + extraFromTitle
    description = truncateDescription(description, warnings, rowLabel)

    const priority = normalisePriority(row.priority, warnings, rowLabel)
    const taskType = normaliseImportTaskType(row.taskType, warnings, rowLabel)
    const owner = String(row.owner ?? '').trim()
    const dueDate = normaliseDueDate(row.dueDate, warnings, rowLabel)
    const source = normaliseSource(row.source, warnings, rowLabel)

    tasks.push({
      title: titleRaw,
      description,
      priority,
      taskType,
      owner,
      dueDate,
      source,
    })
  })

  return { tasks, warnings }
}
