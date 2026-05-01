import { useState, useEffect, useCallback } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const STORAGE_KEY = 'kanban-sidebar-width'
const MIN_W = 140
const MAX_W = 480
const DEFAULT_W = 200

function readInitialWidth() {
  if (typeof window === 'undefined') return DEFAULT_W
  try {
    const n = Number(localStorage.getItem(STORAGE_KEY))
    if (Number.isFinite(n) && n >= MIN_W && n <= MAX_W) return n
  } catch (_) {}
  return DEFAULT_W
}

export default function AppLayout({ theme, onToggleTheme }) {
  const [sidebarWidth, setSidebarWidth] = useState(readInitialWidth)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(sidebarWidth))
  }, [sidebarWidth])

  const startResize = useCallback(
    (e) => {
      if (e.button !== undefined && e.button !== 0) return
      e.preventDefault()
      const startX = e.clientX
      const startW = sidebarWidth

      function onMove(ev) {
        const next = Math.min(
          MAX_W,
          Math.max(MIN_W, startW + (ev.clientX - startX))
        )
        setSidebarWidth(next)
      }
      function onEnd() {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onEnd)
        window.removeEventListener('pointercancel', onEnd)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onEnd)
      window.addEventListener('pointercancel', onEnd)
    },
    [sidebarWidth]
  )

  function handleResizeKeyDown(e) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setSidebarWidth((w) => Math.max(MIN_W, w - 16))
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      setSidebarWidth((w) => Math.min(MAX_W, w + 16))
    }
  }

  return (
    <div
      className="app app-layout"
      style={{ '--sidebar-width': `${sidebarWidth}px` }}
    >
      <aside className="sidebar" aria-label="Main navigation">
        <nav className="sidebar-nav">
          <NavLink to="/" end className="sidebar-link">
            Board
          </NavLink>
          <NavLink to="/epics" className="sidebar-link">
            Epics
          </NavLink>
        </nav>
      </aside>
      <div
        className="sidebar-resize-handle"
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={sidebarWidth}
        aria-valuemin={MIN_W}
        aria-valuemax={MAX_W}
        tabIndex={0}
        onPointerDown={startResize}
        onKeyDown={handleResizeKeyDown}
        aria-label="Resize navigation sidebar. Use arrow keys or drag."
      />
      <div className="app-main">
        <header className="app-header">
          <h1>Kanban Task Board</h1>
          <button
            type="button"
            className="theme-toggle"
            onClick={onToggleTheme}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? (
              <span className="theme-toggle-icon" aria-hidden>🌙</span>
            ) : (
              <span className="theme-toggle-icon" aria-hidden>☀️</span>
            )}
            <span className="theme-toggle-label">
              {theme === 'light' ? 'Dark mode' : 'Light mode'}
            </span>
          </button>
        </header>
        <div className="app-outlet">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
