import { useState, useLayoutEffect } from 'react'

const STORAGE_KEY = 'kanban-theme'

function getStored() {
  try {
    const t = localStorage.getItem(STORAGE_KEY)
    if (t === 'dark' || t === 'light') return t
  } catch (_) {}
  return 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState(getStored)

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, theme)
      }
    } catch (_) {}
  }, [theme])

  function toggleTheme() {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  return [theme, toggleTheme]
}
