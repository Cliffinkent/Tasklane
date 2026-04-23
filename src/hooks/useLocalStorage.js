import { useState, useEffect } from 'react'

const STORAGE_KEY = 'kanban-tasks'

function getStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
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
