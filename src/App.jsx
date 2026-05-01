import { useRef, useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useEpicsStorage } from './hooks/useEpicsStorage'
import { useTheme } from './hooks/useTheme'
import AppLayout from './components/AppLayout'
import Board from './components/Board'
import EpicsPage from './pages/EpicsPage'
import EpicDetailPage from './pages/EpicDetailPage'
import './App.css'

const UNDO_MS = 5000

function resolveEpicId(epicId, epics) {
  if (epicId == null || epicId === '') return null
  return epics.some((e) => e.id === epicId) ? epicId : null
}

function reorderById(items, fromId, toId) {
  if (!fromId || !toId || fromId === toId) return items
  const fromIndex = items.findIndex((x) => x.id === fromId)
  const toIndex = items.findIndex((x) => x.id === toId)
  if (fromIndex < 0 || toIndex < 0) return items
  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

function App() {
  const [tasks, setTasks] = useLocalStorage()
  const [epics, setEpics] = useEpicsStorage()
  const [theme, toggleTheme] = useTheme()
  const [deletedForUndo, setDeletedForUndo] = useState(null)
  const undoTimerRef = useRef(null)

  function handleCreate(data) {
    const epicId = resolveEpicId(data.epicId, epics)
    const task = {
      id: crypto.randomUUID(),
      title: data.title.trim() || 'Untitled',
      description: (data.description || '').trim(),
      columnId: 'backlog',
      epicId,
    }
    setTasks((prev) => [...prev, task])
  }

  function handleMove(taskId, newColumnId) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, columnId: newColumnId } : t))
    )
  }

  function handleUpdate(taskId, { title, description, epicId }) {
    const nextEpicId = resolveEpicId(epicId, epics)
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              title: (title ?? t.title).trim() || 'Untitled',
              description: (description ?? t.description ?? '').trim(),
              epicId:
                epicId === '' || epicId === null || epicId === undefined
                  ? null
                  : nextEpicId,
            }
          : t
      )
    )
  }

  function handleCreateEpic({ name, description }) {
    setEpics((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name,
        description: description || '',
      },
    ])
  }

  function handleDeleteEpic(epicId) {
    setEpics((prev) => prev.filter((e) => e.id !== epicId))
    setTasks((prev) =>
      prev.map((t) => (t.epicId === epicId ? { ...t, epicId: null } : t))
    )
  }

  function handleUpdateEpic(epicId, { name, description }) {
    setEpics((prev) =>
      prev.map((epic) =>
        epic.id === epicId
          ? {
              ...epic,
              name: (name ?? epic.name).trim() || epic.name,
              description: (description ?? epic.description ?? '').trim(),
            }
          : epic
      )
    )
  }

  function handleReorderEpics(fromId, toId) {
    setEpics((prev) => reorderById(prev, fromId, toId))
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
    <>
      <Routes>
        <Route
          element={<AppLayout theme={theme} onToggleTheme={toggleTheme} />}
        >
          <Route
            index
            element={
              <Board
                tasks={tasks}
                epics={epics}
                onCreateTask={handleCreate}
                onMoveTask={handleMove}
                onUpdateTask={handleUpdate}
                onDeleteTask={handleDeleteTask}
              />
            }
          />
          <Route
            path="epics"
            element={
              <EpicsPage
                epics={epics}
                tasks={tasks}
                onCreateEpic={handleCreateEpic}
                onDeleteEpic={handleDeleteEpic}
                onReorderEpics={handleReorderEpics}
              />
            }
          />
          <Route
            path="epics/:epicId"
            element={
              <EpicDetailPage
                epics={epics}
                tasks={tasks}
                onUpdateEpic={handleUpdateEpic}
                onMoveTask={handleMove}
              />
            }
          />
        </Route>
      </Routes>
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
    </>
  )
}

export default App
