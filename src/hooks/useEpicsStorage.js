import { useState, useEffect } from 'react'
import {
  isElectronKanbanStore,
  loadElectronKanbanOnce,
  saveElectronKanbanEpics,
} from '../storage/electronKanbanHydration'

const STORAGE_KEY = 'kanban-epics'

function nowIso() {
  return new Date().toISOString()
}

function parseIsoOrNow(v) {
  if (typeof v !== 'string' || !v.trim()) return nowIso()
  const t = Date.parse(v)
  return Number.isFinite(t) ? v : nowIso()
}

function normalizeStoredEpic(e) {
  if (!e || typeof e !== 'object') return null
  const id = String(e.id ?? '').trim()
  const name = String(e.name ?? '').trim()
  if (!id || !name) return null

  const description = String(e.description ?? '').trim()
  const createdAt = parseIsoOrNow(e.createdAt)
  let updatedAt =
    typeof e.updatedAt === 'string' && e.updatedAt.trim()
      ? e.updatedAt
      : createdAt
  if (!Number.isFinite(Date.parse(updatedAt))) updatedAt = createdAt

  return {
    id,
    name,
    description,
    createdAt,
    updatedAt,
  }
}

function getStored() {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item && typeof item === 'object')
      .map(normalizeStoredEpic)
      .filter(Boolean)
  } catch (_) {
    return []
  }
}

function normalizeStoredEpics(rows) {
  if (!Array.isArray(rows)) return []
  return rows
    .filter((item) => item && typeof item === 'object')
    .map(normalizeStoredEpic)
    .filter(Boolean)
}

export function useEpicsStorage() {
  const [epics, setEpicsState] = useState(() =>
    isElectronKanbanStore() ? [] : getStored()
  )
  const [hydrated, setHydrated] = useState(() => !isElectronKanbanStore())

  useEffect(() => {
    if (!isElectronKanbanStore()) {
      setEpicsState(getStored())
      setHydrated(true)
      return undefined
    }

    let cancelled = false
    loadElectronKanbanOnce().then((payload) => {
      if (cancelled) return
      const fromFile = normalizeStoredEpics(payload?.epics)
      const fromLocal = getStored()
      if (fromFile.length) {
        setEpicsState(fromFile)
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fromFile))
        } catch (_) {}
      } else if (fromLocal.length) {
        setEpicsState(fromLocal)
        saveElectronKanbanEpics(fromLocal)
      } else {
        setEpicsState([])
      }
      setHydrated(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(epics))
      }
    } catch (_) {}
    if (isElectronKanbanStore()) {
      saveElectronKanbanEpics(epics)
    }
  }, [epics, hydrated])

  return [epics, setEpicsState]
}
