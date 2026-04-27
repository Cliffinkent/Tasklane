import { useRef, useState, useEffect } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useTheme } from './hooks/useTheme'
import Board from './components/Board'
import './App.css'

const UNDO_MS = 5000

function App() {
  const [tasks, setTasks] = useLocalStorage()
  const [theme, toggleTheme] = useTheme()
  const [deletedForUndo, setDeletedForUndo] = useState(null)
  const undoTimerRef = useRef(null)

  function handleCreate({ title, description }) {
    const task = {
      id: crypto.randomUUID(),
      title: title.trim() || 'Untitled',
      description: (description || '').trim(),
      columnId: 'backlog',
    }
    setTasks((prev) => [...prev, task])
  }

  function handleMove(taskId, newColumnId) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, columnId: newColumnId } : t))
    )
  }

  function handleUpdate(taskId, { title, description }) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              title: (title ?? t.title).trim() || 'Untitled',
              description: (description ?? t.description ?? '').trim(),
            }
          : t
      )
    )
  }

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current)
      }
    }
  }, [])

  function clearUndoTimer() {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current)
      undoTimerRef.current = null
    }
  }

  function handleDeleteTask(taskId) {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    const label = task.title || 'this task'
    if (!window.confirm(`Delete “${label}”? This can be undone for a few seconds.`)) {
      return
    }
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    setDeletedForUndo({ task })
    clearUndoTimer()
    undoTimerRef.current = setTimeout(() => {
      setDeletedForUndo(null)
      undoTimerRef.current = null
    }, UNDO_MS)
  }

  function handleUndoDelete() {
    if (!deletedForUndo) return
    setTasks((prev) => [...prev, deletedForUndo.task])
    setDeletedForUndo(null)
    clearUndoTimer()
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Kanban Task Board</h1>
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? (
            <span className="theme-toggle-icon" aria-hidden>🌙</span>
          ) : (
            <span className="theme-toggle-icon" aria-hidden>☀️</span>
          )}
          <span className="theme-toggle-label">{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
        </button>
      </header>
      <Board
        tasks={tasks}
        onCreateTask={handleCreate}
        onMoveTask={handleMove}
        onUpdateTask={handleUpdate}
        onDeleteTask={handleDeleteTask}
      />
      {deletedForUndo && (
        <div className="undo-toast" role="status">
          <span className="undo-toast-message">Task deleted</span>
          <button
            type="button"
            className="btn btn-undo"
            onClick={handleUndoDelete}
          >
            Undo
          </button>
        </div>
      )}
    </div>
  )
}

export default App
