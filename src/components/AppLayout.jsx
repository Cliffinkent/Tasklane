import { useState, useEffect, useCallback } from 'react'
import { NavLink, Outlet, useLocation, matchPath } from 'react-router-dom'
import DropZoneSidebarSettings from './DropZoneSidebarSettings'

const STORAGE_KEY = 'kanban-sidebar-width'
const MIN_W = 140
const MAX_W = 480
const DEFAULT_W = 220

function readInitialWidth() {
  if (typeof window === 'undefined') return DEFAULT_W
  try {
    const n = Number(localStorage.getItem(STORAGE_KEY))
    if (Number.isFinite(n) && n >= MIN_W && n <= MAX_W) return n
  } catch (_) {}
  return DEFAULT_W
}

/** Epic detail route: page shows the epic name; no duplicate header here. */
function getPageHeaderMeta(pathname) {
  if (matchPath({ path: '/epics/:epicId', end: true }, pathname)) return null
  if (matchPath({ path: '/', end: true }, pathname)) {
    return {
      title: 'Task Board',
      subtitle: 'Plan, track, and move work from backlog to done.',
    }
  }
  if (matchPath({ path: '/epics', end: true }, pathname)) {
    return {
      title: 'Epics',
      subtitle: 'Group related work into larger delivery outcomes.',
    }
  }
  if (matchPath({ path: '/templates', end: true }, pathname)) {
    return {
      title: 'Templates',
      subtitle: 'Create reusable task patterns for recurring work.',
    }
  }
  if (matchPath({ path: '/archive', end: true }, pathname)) {
    return {
      title: 'Archive',
      subtitle:
        'Tasks removed from the board. Restore them to make them active again.',
    }
  }
  if (matchPath({ path: '/dropzone', end: true }, pathname)) {
    return {
      title: 'Drop Zone',
      subtitle:
        'Paste JSON from Copilot to preview, edit, and import tasks to your board or export to Things 3.',
    }
  }
  return { title: 'Tasklane', subtitle: null }
}

export default function AppLayout({ theme, onToggleTheme }) {
  const location = useLocation()
  const [sidebarWidth, setSidebarWidth] = useState(readInitialWidth)
  const pageHeader = getPageHeaderMeta(location.pathname)

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
      <aside className="sidebar" aria-label="Tasklane">
        <div className="sidebar-brand">
          <p className="sidebar-product-name">Tasklane</p>
          <p className="sidebar-tagline">Work in the Tasklane</p>
          <p className="sidebar-subtitle">Agile Work Tracking</p>
        </div>
        <nav className="sidebar-nav" aria-label="Primary">
          <NavLink to="/" end className="sidebar-link">
            Board
          </NavLink>
          <NavLink to="/epics" className="sidebar-link">
            Epics
          </NavLink>
          <NavLink to="/templates" className="sidebar-link">
            Templates
          </NavLink>
          <NavLink to="/archive" className="sidebar-link">
            Archive
          </NavLink>
          <div className="sidebar-nav-divider" aria-hidden="true" />
          <NavLink to="/dropzone" className="sidebar-link">
            Drop Zone
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <DropZoneSidebarSettings />
          <button
            type="button"
            className="theme-toggle theme-toggle--sidebar"
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
              {theme === 'light' ? 'Dark' : 'Light'}
            </span>
          </button>
        </div>
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
        {pageHeader ? (
          <header className="app-page-header">
            <h1 className="app-page-header-title">{pageHeader.title}</h1>
            {pageHeader.subtitle ? (
              <p className="app-page-header-desc">{pageHeader.subtitle}</p>
            ) : null}
          </header>
        ) : null}
        <div className="app-outlet">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
