import { useState, useEffect } from 'react'

const STORAGE_KEY = 'kanban-tasks'

function normalizeTask(t) {
  if (!t || typeof t !== 'object') return t
  return { ...t, epicId: t.epicId ?? null }
}

function getStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.map(normalizeTask)
    }
  } catch (_) {}
  return []
}

export function useLocalStorage() {
  const [tasks, setTasksState] = useState(getStored)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks])

  return [tasks, setTasksState]
}
