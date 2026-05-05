import { useState, useEffect } from 'react'
import { COLUMN_IDS } from '../data/columns'
import {
  TASK_TYPE_SET,
  PRIORITY_SET,
  DEFAULT_TASK_TYPE,
  DEFAULT_PRIORITY,
} from '../data/taskMetadata'

const STORAGE_KEY = 'kanban-tasks'

function nowIso() {
  return new Date().toISOString()
}

function parseIsoOrNow(v) {
  if (typeof v !== 'string' || !v.trim()) return nowIso()
  const t = Date.parse(v)
  return Number.isFinite(t) ? v : nowIso()
}

function normalizeStoredTask(t) {
  if (!t || typeof t !== 'object') return null
  const id = String(t.id ?? '').trim()
  const title = String(t.title ?? '').trim()
  if (!id || !title) return null

  const columnId = COLUMN_IDS.has(t.columnId) ? t.columnId : 'backlog'
  let epicId = t.epicId
  if (epicId != null && epicId !== '') {
    epicId = String(epicId).trim() || null
  } else {
    epicId = null
  }

  const description = String(t.description ?? '').trim()
  const createdAt = parseIsoOrNow(t.createdAt)
  let updatedAt =
    typeof t.updatedAt === 'string' && t.updatedAt.trim()
      ? t.updatedAt
      : createdAt
  if (!Number.isFinite(Date.parse(updatedAt))) updatedAt = createdAt

  let taskType =
    typeof t.taskType === 'string' && TASK_TYPE_SET.has(t.taskType)
      ? t.taskType
      : DEFAULT_TASK_TYPE
  let priority =
    typeof t.priority === 'string' && PRIORITY_SET.has(t.priority)
      ? t.priority
      : DEFAULT_PRIORITY
  const dueDate =
    typeof t.dueDate === 'string' ? t.dueDate : ''
  const owner = String(t.owner ?? '').trim()

  const rawOrder = Number(t.order)
  const row = {
    id,
    title,
    description,
    columnId,
    epicId,
    createdAt,
    updatedAt,
    taskType,
    priority,
    dueDate,
    owner,
  }
  if (Number.isFinite(rawOrder) && rawOrder >= 0) row.order = rawOrder
  return row
}

/** Stable per-column order: valid numeric orders first, then file order for legacy rows. */
function normalizeOrdersInPayload(tasks) {
  const byCol = new Map()
  tasks.forEach((t, fileIndex) => {
    if (!byCol.has(t.columnId)) byCol.set(t.columnId, [])
    byCol.get(t.columnId).push({ t, fileIndex })
  })
  const idToOrder = new Map()
  for (const rows of byCol.values()) {
    rows.sort((a, b) => {
      const ao = a.t.order
      const bo = b.t.order
      const aValid = typeof ao === 'number' && !Number.isNaN(ao)
      const bValid = typeof bo === 'number' && !Number.isNaN(bo)
      if (aValid && bValid && ao !== bo) return ao - bo
      if (aValid && !bValid) return -1
      if (!aValid && bValid) return 1
      return a.fileIndex - b.fileIndex
    })
    rows.forEach((row, ord) => idToOrder.set(row.t.id, ord))
  }
  return tasks.map((t) => ({
    ...t,
    order: idToOrder.get(t.id) ?? 0,
  }))
}

function getStored() {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const rows = parsed.map(normalizeStoredTask).filter(Boolean)
    return normalizeOrdersInPayload(rows)
  } catch (_) {
    return []
  }
}

export function useLocalStorage() {
  const [tasks, setTasksState] = useState(getStored)

  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
      }
    } catch (_) {}
  }, [tasks])

  return [tasks, setTasksState]
}
