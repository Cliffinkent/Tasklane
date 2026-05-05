import { useState, useEffect } from 'react'
import { TASK_TYPE_SET, PRIORITY_SET, MIGRATION_TASK_TEMPLATES } from '../data/taskMetadata'

const STORAGE_KEY = 'kanban-task-templates'

const DEFAULT_TASK_TYPE = 'Discovery'
const DEFAULT_PRIORITY = 'Medium'

function nowIso() {
  return new Date().toISOString()
}

function parseIsoOrNow(v) {
  if (typeof v !== 'string' || !v.trim()) return nowIso()
  const t = Date.parse(v)
  return Number.isFinite(t) ? v : nowIso()
}

/** Full seed list with timestamps (built-in ids preserved). */
export function getSeedTemplates() {
  const now = nowIso()
  return MIGRATION_TASK_TEMPLATES.map((t) => ({
    ...t,
    dueDate: typeof t.dueDate === 'string' ? t.dueDate : '',
    owner: typeof t.owner === 'string' ? t.owner : '',
    createdAt: now,
    updatedAt: now,
  }))
}

export function normaliseTemplate(t) {
  if (!t || typeof t !== 'object') return null
  const id = String(t.id ?? '').trim()
  let title = String(t.title ?? '').trim()
  let label = String(t.label ?? '').trim()
  if (!id) return null
  if (!title && !label) return null
  if (!title) title = label
  if (!label) label = title

  const taskType =
    typeof t.taskType === 'string' && TASK_TYPE_SET.has(t.taskType)
      ? t.taskType
      : DEFAULT_TASK_TYPE
  const priority =
    typeof t.priority === 'string' && PRIORITY_SET.has(t.priority)
      ? t.priority
      : DEFAULT_PRIORITY

  const description = String(t.description ?? '').trim()
  const dueDate = typeof t.dueDate === 'string' ? t.dueDate : ''
  const owner = String(t.owner ?? '').trim()

  const createdAt = parseIsoOrNow(t.createdAt)
  let updatedAt =
    typeof t.updatedAt === 'string' && t.updatedAt.trim()
      ? t.updatedAt
      : createdAt
  if (!Number.isFinite(Date.parse(updatedAt))) updatedAt = createdAt

  return {
    id,
    label,
    title,
    description,
    taskType,
    priority,
    dueDate,
    owner,
    createdAt,
    updatedAt,
  }
}

function getStored() {
  try {
    if (typeof localStorage === 'undefined') return getSeedTemplates()
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null || raw === '') {
      return getSeedTemplates()
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return getSeedTemplates()
    if (parsed.length === 0) return []
    const normalised = parsed.map(normaliseTemplate).filter(Boolean)
    if (normalised.length === 0 && parsed.length > 0) {
      return getSeedTemplates()
    }
    return normalised
  } catch (_) {
    return getSeedTemplates()
  }
}

export function useTemplatesStorage() {
  const [templates, setTemplates] = useState(getStored)

  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
      }
    } catch (_) {}
  }, [templates])

  return [templates, setTemplates]
}
