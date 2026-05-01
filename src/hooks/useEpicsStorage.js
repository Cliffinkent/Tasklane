import { useState, useEffect } from 'react'

const STORAGE_KEY = 'kanban-epics'

function getStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (_) {}
  return []
}

export function useEpicsStorage() {
  const [epics, setEpicsState] = useState(getStored)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(epics))
  }, [epics])

  return [epics, setEpicsState]
}
