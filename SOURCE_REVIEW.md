# Tasklane — developer handoff

Architecture notes and embedded file snapshots for onboarding. **Embedded code blocks below are historical** (captured before Drop Zone, Archive, Templates, and Electron landed). For the live app, use the repository tree and [`README.md`](README.md).

**Current routes:** `/` (board), `/epics`, `/epics/:epicId`, `/templates`, `/archive`, `/dropzone`.

**Key areas not reflected in older snapshots:** `src/pages/DropZone.jsx`, `src/pages/ArchivePage.jsx`, `electron/`, `src/utils/parseDropZoneJSON.js`, `src/data/dropzonePromptDefaults.js`.

Excludes `node_modules/`, `dist/`, `build/`, `.git/`, `coverage/`, and lock files from the snapshot sections.

## Project tree

```text
Task Manager/
├── index.html
├── package.json
├── README.md
├── vite.config.js
├── vercel.json
├── public/
│   ├── _redirects
│   └── vite.svg
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── App.css
    ├── index.css
    ├── data/
    │   └── columns.js
    ├── components/
    │   ├── AppLayout.jsx
    │   ├── Board.jsx
    │   ├── Card.jsx
    │   ├── Column.jsx
    │   └── TaskForm.jsx
    ├── hooks/
    │   ├── useEpicsStorage.js
    │   ├── useLocalStorage.js
    │   └── useTheme.js
    └── pages/
        ├── EpicDetailPage.jsx
        └── EpicsPage.jsx
```

This file is **`SOURCE_REVIEW.md`** at the repository root.

### `src/main.jsx`

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
```

### `src/App.jsx`

```jsx
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
```

### `src/components/AppLayout.jsx`

```jsx
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
```

### `src/components/Board.jsx`

```jsx
import { useState, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import { COLUMNS } from '../data/columns'
import Column from './Column'
import TaskForm from './TaskForm'
import Card, { CardContent } from './Card'

export default function Board({
  tasks,
  epics,
  onCreateTask,
  onMoveTask,
  onUpdateTask,
  onDeleteTask,
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [activeId, setActiveId] = useState(null)

  useEffect(() => {
    if (editingTaskId && !tasks.some((t) => t.id === editingTaskId)) {
      setEditingTaskId(null)
    }
  }, [tasks, editingTaskId])

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: '0' } },
    }),
    duration: 220,
    easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  )

  function handleDragStart(event) {
    setActiveId(event.active.id)
  }

  function handleDragEnd(event) {
    const { active, over } = event
    setActiveId(null)
    if (over && active.id !== over.id) {
      onMoveTask(active.id, over.id)
    }
  }

  return (
    <div className="board">
      <div className="board-toolbar">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          Add task
        </button>
      </div>
      {showForm && (
        <div className="board-form-overlay">
          <div className="board-form-panel">
            <TaskForm
              epics={epics}
              onSubmit={(data) => {
                onCreateTask(data)
                setShowForm(false)
              }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}
      {editingTaskId && (
        <div className="board-form-overlay">
          <div className="board-form-panel">
            <TaskForm
              epics={epics}
              initialTask={tasks.find((t) => t.id === editingTaskId)}
              onSubmit={(data) => {
                onUpdateTask(editingTaskId, data)
                setEditingTaskId(null)
              }}
              onCancel={() => setEditingTaskId(null)}
            />
          </div>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="board-columns">
          {COLUMNS.map((column) => (
            <Column
              key={column.id}
              columnId={column.id}
              title={column.title}
              tasks={tasks.filter((t) => t.columnId === column.id)}
              epics={epics}
              onMoveTask={onMoveTask}
              onEditTask={setEditingTaskId}
              onDeleteTask={onDeleteTask}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={dropAnimation}>
          {activeTask ? (
            <div className="card-overlay-wrapper">
              <CardContent
                task={activeTask}
                epics={epics}
                onMove={() => {}}
                onEdit={null}
                onDelete={null}
                isOverlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
```

### `src/components/Card.jsx`

```jsx
import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { COLUMNS } from '../data/columns'

function CardContent({ task, epics = [], onMove, onEdit, onDelete, isOverlay = false }) {
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const otherColumns = COLUMNS.filter((c) => c.id !== task.columnId)
  const epic = task.epicId ? epics.find((e) => e.id === task.epicId) : null

  return (
    <div className={`card ${isOverlay ? 'card--overlay' : ''}`}>
      <div className="card-header">
        <div className="card-title-block">
          <h3 className="card-title">{task.title}</h3>
          {epic ? (
            <span className="epic-badge">{epic.name}</span>
          ) : task.epicId ? (
            <span className="epic-badge epic-badge--unknown">Unknown epic</span>
          ) : null}
        </div>
        {!isOverlay && (
          <div className="card-actions">
            {otherColumns.length > 0 && (
              <div className="card-move">
                <button
                  type="button"
                  className="card-move-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMoveMenu((v) => !v)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label="Move task"
                >
                  Move
                </button>
            {showMoveMenu && (
              <>
                <div
                  className="card-move-backdrop"
                  onClick={() => setShowMoveMenu(false)}
                  aria-hidden
                />
                <div className="card-move-menu">
                  {otherColumns.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      className="card-move-item"
                      onClick={() => {
                        onMove(task.id, col.id)
                        setShowMoveMenu(false)
                      }}
                    >
                      → {col.title}
                    </button>
                  ))}
                </div>
              </>
            )}
              </div>
            )}
            <button
              type="button"
              className="card-edit-btn"
              onClick={(e) => {
                e.stopPropagation()
                onEdit?.(task.id)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Edit task"
            >
              Edit
            </button>
            <button
              type="button"
              className="card-delete-btn"
              onClick={(e) => {
                e.stopPropagation()
                onDelete?.(task.id)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Delete task"
            >
              Delete
            </button>
          </div>
        )}
      </div>
      {task.description && (
        <p className="card-description">{task.description}</p>
      )}
    </div>
  )
}

export default function Card({ task, epics, onMove, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: task.id,
    data: { task, columnId: task.columnId },
  })

  return (
    <div
      ref={setNodeRef}
      className={`card-wrapper ${isDragging ? 'card-wrapper--dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <CardContent
        task={task}
        epics={epics}
        onMove={onMove}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  )
}

export { CardContent }
```

### `src/components/Column.jsx`

```jsx
import { useDroppable } from '@dnd-kit/core'
import Card from './Card'

export default function Column({
  columnId,
  title,
  tasks,
  epics,
  onMoveTask,
  onEditTask,
  onDeleteTask,
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId })

  return (
    <div className={`column ${isOver ? 'column--over' : ''}`}>
      <h2 className="column-title">{title}</h2>
      <div ref={setNodeRef} className="column-cards">
        {tasks.map((task) => (
          <Card
            key={task.id}
            task={task}
            epics={epics}
            onMove={onMoveTask}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
          />
        ))}
      </div>
    </div>
  )
}
```

### `src/components/TaskForm.jsx`

```jsx
import { useState, useEffect } from 'react'

export default function TaskForm({ onSubmit, onCancel, initialTask, epics = [] }) {
  const [title, setTitle] = useState(initialTask?.title ?? '')
  const [description, setDescription] = useState(initialTask?.description ?? '')
  const [epicId, setEpicId] = useState(initialTask?.epicId ?? '')

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title ?? '')
      setDescription(initialTask.description ?? '')
      setEpicId(initialTask.epicId ?? '')
    }
  }, [initialTask])

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({ title, description, epicId: epicId || '' })
    if (!initialTask) {
      setTitle('')
      setDescription('')
      setEpicId('')
    }
  }

  const isEdit = Boolean(initialTask)

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="task-form-input"
        autoFocus
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="task-form-textarea"
        rows={3}
      />
      <label className="task-form-label" htmlFor="task-epic">
        Epic
      </label>
      <select
        id="task-epic"
        className="task-form-select"
        value={epicId || ''}
        onChange={(e) => setEpicId(e.target.value)}
      >
        <option value="">No epic</option>
        {epics.map((epic) => (
          <option key={epic.id} value={epic.id}>
            {epic.name}
          </option>
        ))}
      </select>
      <div className="task-form-actions">
        <button type="submit" className="btn btn-primary">
          {isEdit ? 'Save' : 'Add task'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
```

### `src/pages/EpicDetailPage.jsx`

```jsx
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { COLUMNS } from '../data/columns'

export default function EpicDetailPage({ epics, tasks, onUpdateEpic, onMoveTask }) {
  const { epicId } = useParams()
  const epic = epics.find((e) => e.id === epicId)
  const [name, setName] = useState(epic?.name ?? '')
  const [description, setDescription] = useState(epic?.description ?? '')

  useEffect(() => {
    setName(epic?.name ?? '')
    setDescription(epic?.description ?? '')
  }, [epic])

  const linkedTasks = useMemo(
    () => tasks.filter((task) => task.epicId === epicId),
    [tasks, epicId]
  )

  if (!epic) {
    return (
      <div className="epic-detail-page">
        <Link to="/epics" className="epic-detail-back">
          ← Back to Epics
        </Link>
        <h2 className="epic-detail-title">Epic not found</h2>
        <p className="epic-detail-subtitle">
          This epic may have been deleted.
        </p>
      </div>
    )
  }

  function handleSave(e) {
    e.preventDefault()
    const nextName = name.trim()
    if (!nextName) return
    onUpdateEpic(epic.id, { name: nextName, description: description.trim() })
  }

  return (
    <div className="epic-detail-page">
      <Link to="/epics" className="epic-detail-back">
        ← Back to Epics
      </Link>
      <div className="epic-detail-header">
        <h2 className="epic-detail-title">{epic.name}</h2>
        <span className="epic-count-chip">
          {linkedTasks.length} task{linkedTasks.length === 1 ? '' : 's'}
        </span>
      </div>
      <p className="epic-detail-subtitle">
        Quick-edit this epic and update task statuses inline.
      </p>

      <form className="epic-form epic-detail-edit-form" onSubmit={handleSave}>
        <h3 className="epic-form-heading">Edit epic</h3>
        <input
          type="text"
          className="task-form-input"
          placeholder="Epic name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className="task-form-textarea"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
        <div className="task-form-actions">
          <button type="submit" className="btn btn-primary">
            Save epic
          </button>
        </div>
      </form>

      <section className="epic-linked-tasks" aria-labelledby="epic-linked-tasks-heading">
        <h3 id="epic-linked-tasks-heading" className="epics-list-heading">
          Linked tasks
        </h3>
        {linkedTasks.length === 0 ? (
          <p className="epics-empty">No tasks are linked to this epic yet.</p>
        ) : (
          <ul className="epic-task-list">
            {linkedTasks.map((task) => (
              <li key={task.id} className="epic-task-item">
                <div className="epic-task-body">
                  <p className="epic-task-title">{task.title}</p>
                  {task.description ? (
                    <p className="epic-task-description">{task.description}</p>
                  ) : null}
                </div>
                <label className="epic-task-status">
                  <span className="task-form-label">Status</span>
                  <select
                    className="task-form-select"
                    value={task.columnId}
                    onChange={(e) => onMoveTask(task.id, e.target.value)}
                  >
                    {COLUMNS.map((column) => (
                      <option key={column.id} value={column.id}>
                        {column.title}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
```

### `src/pages/EpicsPage.jsx`

```jsx
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

export default function EpicsPage({
  epics,
  tasks,
  onCreateEpic,
  onDeleteEpic,
  onReorderEpics,
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [draggingEpicId, setDraggingEpicId] = useState(null)
  const [dragOverEpicId, setDragOverEpicId] = useState(null)

  const taskCountsByEpic = useMemo(() => {
    const counts = {}
    for (const task of tasks) {
      if (task.epicId) counts[task.epicId] = (counts[task.epicId] || 0) + 1
    }
    return counts
  }, [tasks])

  function handleSubmit(e) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    onCreateEpic({ name: n, description: description.trim() })
    setName('')
    setDescription('')
  }

  function handleDragStart(epicId) {
    setDraggingEpicId(epicId)
  }

  function handleDrop(targetEpicId) {
    if (!draggingEpicId || draggingEpicId === targetEpicId) {
      setDraggingEpicId(null)
      setDragOverEpicId(null)
      return
    }
    onReorderEpics(draggingEpicId, targetEpicId)
    setDraggingEpicId(null)
    setDragOverEpicId(null)
  }

  return (
    <div className="epics-page">
      <div className="epics-page-intro">
        <h2 className="epics-page-title">Epics</h2>
        <p className="epics-page-desc">
          Group work into epics, then link tasks on the board to an epic when you create or edit them.
        </p>
      </div>
      <form className="epic-form" onSubmit={handleSubmit}>
        <h3 className="epic-form-heading">New epic</h3>
        <input
          type="text"
          className="task-form-input"
          placeholder="Epic name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className="task-form-textarea"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
        <button type="submit" className="btn btn-primary">
          Create epic
        </button>
      </form>
      <section className="epics-list-section" aria-labelledby="epics-list-heading">
        <h3 id="epics-list-heading" className="epics-list-heading">
          All epics ({epics.length})
        </h3>
        {epics.length > 1 ? (
          <p className="epics-hint">Drag epics to reorder them.</p>
        ) : null}
        {epics.length === 0 ? (
          <p className="epics-empty">No epics yet. Create one above.</p>
        ) : (
          <ul className="epics-list">
            {epics.map((epic) => (
              <li
                key={epic.id}
                className={`epics-list-item ${
                  dragOverEpicId === epic.id ? 'epics-list-item--drag-over' : ''
                }`}
                draggable
                onDragStart={() => handleDragStart(epic.id)}
                onDragEnd={() => {
                  setDraggingEpicId(null)
                  setDragOverEpicId(null)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOverEpicId(epic.id)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  handleDrop(epic.id)
                }}
              >
                <div className="epics-list-body">
                  <div className="epics-list-name-row">
                    <span className="epics-drag-handle" aria-hidden>
                      ::
                    </span>
                    <Link to={`/epics/${epic.id}`} className="epics-list-name-link">
                      <span className="epics-list-name">{epic.name}</span>
                    </Link>
                    <span className="epic-count-chip">
                      {taskCountsByEpic[epic.id] || 0} task
                      {(taskCountsByEpic[epic.id] || 0) === 1 ? '' : 's'}
                    </span>
                  </div>
                  {epic.description ? (
                    <p className="epics-list-desc">{epic.description}</p>
                  ) : null}
                </div>
                <div className="epics-list-actions">
                  <Link to={`/epics/${epic.id}`} className="btn btn-ghost epics-list-open">
                    Open
                  </Link>
                  <button
                    type="button"
                    className="btn btn-ghost epics-list-delete"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete epic “${epic.name}”? Tasks linked to it will no longer be assigned to this epic.`
                        )
                      ) {
                        onDeleteEpic(epic.id)
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
```

### `src/hooks/useEpicsStorage.js`

```js
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
```

### `src/hooks/useLocalStorage.js`

```js
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
```

### `src/hooks/useTheme.js`

```js
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
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  function toggleTheme() {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  return [theme, toggleTheme]
}
```

### `src/data/columns.js`

```js
export const COLUMNS = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'blocked', title: 'Blocked' },
  { id: 'done', title: 'Done' },
]
```

### `vite.config.js`

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

### `public/_redirects`

```text
/*    /index.html   200
```

### `vercel.json`

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### `index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kanban Task Board</title>
    <script>
      try {
        var t = localStorage.getItem('kanban-theme');
        if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
      } catch (_) {}
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### `src/index.css`

```css
* {
  box-sizing: border-box;
}

:root {
  --bg-page: #f5f5f5;
  --bg-column: #fff;
  --bg-card: #f8fafc;
  --border: #e2e8f0;
  --text-primary: #1a1a1a;
  --text-heading: #1e293b;
  --text-muted: #334155;
  --text-secondary: #64748b;
  --column-over-bg: #eff6ff;
  --column-over-border: #2563eb;
  --btn-ghost-bg-hover: #f1f5f9;
  --btn-ghost-color: #64748b;
  --card-move-bg: #e2e8f0;
  --card-move-bg-hover: #cbd5e1;
  --card-move-color: #475569;
  --menu-bg: #fff;
  --menu-border: #e2e8f0;
  --menu-item-hover: #f1f5f9;
  --overlay-bg: rgba(0, 0, 0, 0.4);
  --panel-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  --card-shadow-drag: 0 12px 28px rgba(0, 0, 0, 0.15);
  --input-focus-border: #2563eb;
  --input-focus-ring: rgba(37, 99, 235, 0.2);
}

[data-theme="dark"] {
  --bg-page: #1e293b;
  --bg-column: #334155;
  --bg-card: #475569;
  --border: #475569;
  --text-primary: #f1f5f9;
  --text-heading: #f8fafc;
  --text-muted: #cbd5e1;
  --text-secondary: #94a3b8;
  --column-over-bg: #475569;
  --column-over-border: #60a5fa;
  --btn-ghost-bg-hover: #475569;
  --btn-ghost-color: #94a3b8;
  --card-move-bg: #64748b;
  --card-move-bg-hover: #94a3b8;
  --card-move-color: #cbd5e1;
  --menu-bg: #334155;
  --menu-border: #475569;
  --menu-item-hover: #475569;
  --overlay-bg: rgba(0, 0, 0, 0.6);
  --panel-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  --card-shadow-drag: 0 12px 28px rgba(0, 0, 0, 0.4);
  --input-focus-border: #60a5fa;
  --input-focus-ring: rgba(96, 165, 250, 0.3);
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg-page);
  color: var(--text-primary);
  transition: background-color 0.2s ease, color 0.2s ease;
}

#root {
  min-height: 100vh;
}
```

### `src/App.css`

```css
.app {
  min-height: 100vh;
  padding: 1rem;
}

.app-layout {
  display: flex;
  min-height: 100vh;
  padding: 0;
}

.sidebar {
  background: var(--bg-column);
  padding: 1rem 0;
}

@media (min-width: 641px) {
  .app-layout .sidebar {
    flex: 0 0 var(--sidebar-width, 200px);
    width: var(--sidebar-width, 200px);
    min-width: 0;
    border-right: 1px solid var(--border);
  }
}

.sidebar-resize-handle {
  display: none;
}

@media (min-width: 641px) {
  .sidebar-resize-handle {
    display: block;
    flex: 0 0 6px;
    width: 6px;
    align-self: stretch;
    cursor: col-resize;
    touch-action: none;
    background: transparent;
    border: none;
    padding: 0;
    margin: 0;
    position: relative;
    z-index: 1;
  }

  .sidebar-resize-handle:hover,
  .sidebar-resize-handle:focus-visible {
    background: var(--border);
    outline: none;
  }

  .sidebar-resize-handle:focus-visible {
    box-shadow: inset 0 0 0 1px var(--input-focus-border);
  }
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sidebar-link {
  display: block;
  padding: 0.65rem 1.25rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-muted);
  text-decoration: none;
  border-left: 3px solid transparent;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.sidebar-link:hover {
  background: var(--btn-ghost-bg-hover);
  color: var(--text-primary);
}

.sidebar-link.active {
  color: var(--input-focus-border);
  background: var(--column-over-bg);
  border-left-color: var(--column-over-border);
}

.app-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.app-outlet {
  flex: 1;
  min-width: 0;
}

.app-header {
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.app-header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

.theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.theme-toggle:hover {
  background: var(--btn-ghost-bg-hover);
  color: var(--text-primary);
}

.theme-toggle-icon {
  font-size: 1.1rem;
}

.theme-toggle-label {
  font-weight: 500;
}

.undo-toast {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--bg-column);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: var(--panel-shadow);
  z-index: 50;
  animation: undo-toast-in 0.25s ease;
}

@keyframes undo-toast-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(0.5rem);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.undo-toast-message {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.btn-undo {
  background: var(--text-muted);
  color: var(--bg-page);
}

.btn-undo:hover {
  filter: brightness(1.1);
}

/* Buttons */
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-ghost {
  background: transparent;
  color: var(--btn-ghost-color);
}

.btn-ghost:hover {
  background: var(--btn-ghost-bg-hover);
  color: var(--text-muted);
}

/* Board */
.board {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.board-toolbar {
  margin-bottom: 0.5rem;
}

.board-columns {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  min-height: 400px;
  width: 100%;
}

@media (max-width: 900px) {
  .board-columns {
    flex-direction: column;
    overflow-x: visible;
  }
}

/* Column */
.column {
  flex: 1 1 0;
  min-width: 200px;
  max-width: 360px;
  background: var(--bg-column);
  border-radius: 8px;
  border: 1px solid var(--border);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 180px);
  transition: background-color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

@media (max-width: 900px) {
  .column {
    min-width: 0;
    max-width: none;
    flex: 1 1 auto;
  }
}

.column--over {
  background: var(--column-over-bg);
  box-shadow: inset 0 0 0 2px var(--column-over-border);
}

.column-title {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-muted);
}

.column-cards {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
  min-height: 60px;
  border-radius: 6px;
  transition: background-color 0.15s ease;
}

/* Card */
.card-wrapper {
  cursor: grab;
  transition: opacity 0.2s ease;
}

.card-wrapper:active {
  cursor: grabbing;
}

.card-wrapper--dragging {
  opacity: 0.4;
  transition: opacity 0.2s ease;
}

.card-wrapper--dragging .card {
  box-shadow: none;
}

.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.75rem 1rem;
  position: relative;
  transition: box-shadow 0.2s ease, transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
}

.card--overlay {
  box-shadow: var(--card-shadow-drag);
  transform: rotate(2deg);
  cursor: grabbing;
}

.card-overlay-wrapper {
  cursor: grabbing;
  transform: rotate(2deg);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.card-title-block {
  flex: 1;
  min-width: 0;
}

.card-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-heading);
  word-break: break-word;
}

.epic-badge {
  display: inline-block;
  margin-top: 0.35rem;
  padding: 0.15rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--input-focus-border);
  background: var(--column-over-bg);
  border-radius: 4px;
  border: 1px solid var(--border);
}

.epic-badge--unknown {
  color: var(--text-secondary);
  font-weight: 500;
  text-transform: none;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.card-move {
  position: relative;
}

.card-edit-btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background: var(--card-move-bg);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--card-move-color);
}

.card-edit-btn:hover {
  background: var(--card-move-bg-hover);
}

.card-delete-btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  color: #b91c1c;
}

[data-theme="dark"] .card-delete-btn {
  color: #f87171;
}

.card-delete-btn:hover {
  background: rgba(185, 28, 28, 0.08);
}

[data-theme="dark"] .card-delete-btn:hover {
  background: rgba(248, 113, 113, 0.12);
}

.card-move-btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background: var(--card-move-bg);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--card-move-color);
}

.card-move-btn:hover {
  background: var(--card-move-bg-hover);
}

.card-move-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1;
}

.card-move-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.25rem;
  background: var(--menu-bg);
  border: 1px solid var(--menu-border);
  border-radius: 6px;
  box-shadow: var(--panel-shadow);
  z-index: 2;
  min-width: 140px;
}

.card-move-item {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
}

.card-move-item:hover {
  background: var(--menu-item-hover);
}

.card-description {
  margin: 0.5rem 0 0 0;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Task form */
.board-form-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  padding: 1rem;
}

.board-form-panel {
  background: var(--bg-column);
  border-radius: 8px;
  padding: 1.5rem;
  width: 100%;
  max-width: 400px;
  box-shadow: var(--panel-shadow);
  border: 1px solid var(--border);
}

.task-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.task-form-input {
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-card);
  color: var(--text-primary);
}

.task-form-input:focus,
.task-form-textarea:focus {
  outline: none;
  border-color: var(--input-focus-border);
  box-shadow: 0 0 0 2px var(--input-focus-ring);
}

.task-form-textarea {
  padding: 0.5rem 0.75rem;
  font-size: 0.9375rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  resize: vertical;
  font-family: inherit;
  background: var(--bg-card);
  color: var(--text-primary);
}

.task-form-actions {
  display: flex;
  gap: 0.5rem;
}

.task-form-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-muted);
}

.task-form-select {
  padding: 0.5rem 0.75rem;
  font-size: 0.9375rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-card);
  color: var(--text-primary);
  cursor: pointer;
}

.task-form-select:focus {
  outline: none;
  border-color: var(--input-focus-border);
  box-shadow: 0 0 0 2px var(--input-focus-ring);
}

/* Epics page */
.epics-page {
  max-width: 640px;
}

.epics-page-intro {
  margin-bottom: 2rem;
}

.epics-page-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.epics-page-desc {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.epic-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 2rem;
  padding: 1.25rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.epic-form-heading {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  color: var(--text-muted);
}

.epics-list-section {
  margin-top: 0.5rem;
}

.epics-list-heading {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: var(--text-muted);
}

.epics-hint {
  margin: -0.5rem 0 0.75rem 0;
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.epics-empty {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--text-secondary);
}

.epics-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.epics-list-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-column);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.epics-list-item--drag-over {
  border-color: var(--column-over-border);
  box-shadow: 0 0 0 2px var(--column-over-bg);
}

.epics-list-body {
  min-width: 0;
}

.epics-list-name-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.epics-drag-handle {
  font-weight: 700;
  color: var(--text-secondary);
  cursor: grab;
  user-select: none;
}

.epics-list-name-link {
  text-decoration: none;
}

.epics-list-name {
  font-weight: 600;
  color: var(--text-heading);
}

.epics-list-name-link:hover .epics-list-name {
  text-decoration: underline;
}

.epic-count-chip {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: var(--column-over-bg);
  color: var(--input-focus-border);
  font-size: 0.75rem;
  font-weight: 600;
}

.epics-list-desc {
  margin: 0.35rem 0 0 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.epics-list-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.epics-list-open {
  text-decoration: none;
}

.epics-list-delete {
  flex-shrink: 0;
  color: #b91c1c;
}

[data-theme="dark"] .epics-list-delete {
  color: #f87171;
}

/* Epic detail page */
.epic-detail-page {
  max-width: 760px;
}

.epic-detail-back {
  display: inline-block;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: var(--input-focus-border);
  text-decoration: none;
}

.epic-detail-back:hover {
  text-decoration: underline;
}

.epic-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

.epic-detail-title {
  margin: 0;
  font-size: 1.4rem;
  color: var(--text-primary);
}

.epic-detail-subtitle {
  margin: 0 0 1.25rem 0;
  color: var(--text-secondary);
  font-size: 0.9375rem;
}

.epic-detail-edit-form {
  margin-bottom: 1.5rem;
}

.epic-linked-tasks {
  margin-top: 1rem;
}

.epic-task-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.epic-task-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  background: var(--bg-column);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.85rem 1rem;
}

.epic-task-body {
  min-width: 0;
}

.epic-task-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-heading);
}

.epic-task-description {
  margin: 0.4rem 0 0 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.epic-task-status {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 170px;
}

@media (max-width: 640px) {
  .app-layout {
    flex-direction: column;
  }

  .sidebar {
    flex: none;
    width: auto;
    border-right: none;
    border-bottom: 1px solid var(--border);
    padding: 0.75rem 0;
  }

  .sidebar-nav {
    flex-direction: row;
    flex-wrap: wrap;
    padding: 0 0.5rem;
  }

  .sidebar-link {
    border-left: none;
    border-bottom: 3px solid transparent;
    border-radius: 6px;
  }

  .sidebar-link.active {
    border-left-color: transparent;
    border-bottom-color: var(--column-over-border);
  }

  .epics-list-item,
  .epic-task-item {
    flex-direction: column;
  }

  .epics-list-actions {
    width: 100%;
  }

  .epic-task-status {
    min-width: 0;
    width: 100%;
  }
}
```

### `package.json`

```json
{
  "name": "task-manager",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/utilities": "^3.2.2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8"
  }
}
```

### `README.md`

```markdown
# Kanban Task Manager

A browser-based Kanban board built with React and Vite. Tasks are stored locally in your browser (no server required).

## Features

- **Board** — Four columns: Backlog, In Progress, Blocked, Done.
- **Tasks** — Title, description, create, edit, delete (with confirm and short undo).
- **Drag and drop** — Move cards between columns (`@dnd-kit`).
- **Epics** — Create epics, assign tasks to an epic, reorder epics, open an epic detail page with linked tasks and inline status changes.
- **Theme** — Light / dark mode, persisted per browser.
- **Layout** — Resizable sidebar navigation.

## Requirements

- [Node.js](https://nodejs.org/) (includes `npm`)

## Setup and run

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

### Other scripts

| Command        | Description                    |
| -------------- | ------------------------------ |
| `npm run dev`  | Start dev server with hot reload |
| `npm run build` | Production build to `dist/`   |
| `npm run preview` | Preview the production build locally |

## Data storage

All data is saved in **localStorage** on your machine:

| Key              | Contents                          |
| ---------------- | --------------------------------- |
| `kanban-tasks`   | Task list (JSON)                  |
| `kanban-epics`   | Epics list (JSON)                 |
| `kanban-theme`   | `light` or `dark`                 |
| `kanban-sidebar-width` | Sidebar width in pixels (desktop) |

Clear site data for this origin in your browser settings to reset the app.

## Tech stack

- [React 18](https://react.dev/)
- [Vite 5](https://vitejs.dev/)
- [React Router](https://reactrouter.com/) — `/` (board), `/epics`, `/epics/:epicId`
- [@dnd-kit](https://dndkit.com/) — drag and drop

## Project layout (high level)

- `src/App.jsx` — Routes, task/epic state, undo delete
- `src/components/` — Board, columns, cards, layout, forms
- `src/pages/` — Epics list and epic detail
- `src/hooks/` — `useLocalStorage`, `useEpicsStorage`, `useTheme`
- `public/_redirects` — SPA fallback for Netlify (see Deployment)
- `vercel.json` — SPA fallback for Vercel (see Deployment)

## Deployment

The app is a static SPA: run `npm run build` and deploy the `dist/` folder. Because React Router uses the History API, the host must serve `index.html` for unknown paths (so `/epics` works on refresh).

### Netlify

1. Connect the repo or drag-and-drop the `dist` folder after a local build.
2. Build settings (if building on Netlify):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. This repo includes [`public/_redirects`](public/_redirects), which Vite copies into `dist` so client routes resolve correctly.

### Vercel

1. Import the project; Vercel detects Vite.
2. Defaults: **Build Command** `npm run build`, **Output Directory** `dist`.
3. [`vercel.json`](vercel.json) rewrites all paths to `index.html` for SPA routing.

### GitHub Pages (project site: `https://<user>.github.io/<repo>/`)

1. Set the Vite base path to your repo name so assets load correctly. In [`vite.config.js`](vite.config.js):

   ```js
   export default defineConfig({
     plugins: [react()],
     base: '/Tasklane/',
   })
   ```

2. Build and publish `dist/` to the `gh-pages` branch (or use [GitHub Actions](https://vitejs.dev/guide/static-deploy.html#github-pages) from the Vite docs).
3. In the repo **Settings → Pages**, choose the branch/folder that serves the built site.

Use a **project** site URL as above. A **user** site (`username.github.io` with no path) can use `base: '/'`.

### Local production check

```bash
npm run build
npm run preview
```

Visit the printed URL and try `/epics` and a direct refresh to confirm routing works.

## License

[MIT](LICENSE) — Copyright (c) 2026 Cliff Parker.
```

---

## Task Archive — handoff summary

**Feature:** Task Archive

**User behaviour**

- Archive from a board card toolbar (**Archive**).
- Archived tasks disappear from the board, epic counts, epic detail, and Drop Zone duplicate checks.
- **Archive** in the sidebar (`/archive`, HashRouter `#/archive`) lists archived tasks.
- **Restore** returns the task to its previous lane (`columnId` and `order` preserved).
- **Delete** on the Archive page uses the existing confirm-and-undo flow.
- Short status toasts: “Task archived” / “Task restored” (reuses `.undo-toast` styling).

**Data model**

- `archived: boolean` on each task — lifecycle state (active vs archived).
- `columnId` remains the Kanban lane (Backlog, In Progress, Blocked, Done); not used for archive.

**Persistence**

- Unchanged `localStorage` key: `kanban-tasks`.
- Legacy tasks without `archived` load as active (`Boolean(t.archived)` in normalisation).
- No server-side persistence.

**Electron**

- The desktop shell loads the Vite renderer from `dist/index.html` (not duplicated `src/` under `electron/`).
- Run `npm run build` before `npm run pack` (`pack` does not build the renderer).
- Use `npm run dist` for a fresh DMG; `npm run desktop:dist` to run Electron against a local production build.

**Known non-goals**

- No bulk archive, archive search, server persistence, or archive confirmation dialog.

---

## Task Archive implementation notes

*Added for handoff. The embedded file snapshots above are historical; the live app includes archive support.*

### Files touched

| Area | Files |
| --- | --- |
| Model and persistence | `src/hooks/useLocalStorage.js` (`archived` on normalise and save) |
| State and routes | `src/App.jsx` (`partitionTasksByArchive`, handlers, `/archive` route, `activeTasks` props) |
| Board UI | `src/components/Board.jsx`, `src/components/Column.jsx`, `src/components/Card.jsx` (Archive button) |
| Archive UI | `src/pages/ArchivePage.jsx` |
| Navigation | `src/components/AppLayout.jsx` |
| Styles | `src/App.css` |

### Model choice

- **`archived: boolean`** — lifecycle flag (active vs archived).
- **`columnId`** — Kanban lane only (Backlog, In Progress, Blocked, Done). Not overloaded for archive.
- On archive/restore, only `archived` and `updatedAt` change; **`columnId` and `order` are preserved** so restore returns the card to the same lane position.

### Why filter in `App.jsx`

`App.jsx` holds the full `tasks` array (source of truth for `localStorage`). It derives `activeTasks` and `archivedTasks` once and passes **active tasks only** to the board, Epics, epic detail, and Drop Zone. That avoids archived tasks leaking into board counts, epic counts, duplicate import checks, or drag-and-drop. The Archive page receives `archivedTasks` only.

### Known limitations

- No bulk archive or multi-select archive.
- No search or filter on the Archive page.
- No server persistence; archive state lives in the same `kanban-tasks` `localStorage` key as active tasks.
- No archive confirmation dialog (restore is the undo path).
- Reposition logic ignores archived rows when computing column order on the board.

### Handoff recommendation (backend)

If Tasklane gains an API and database:

- Treat **`archived` as a first-class task field** in the schema and API (not as a pseudo-column).
- Keep the semantic split: **archive = lifecycle**, **`columnId` = board lane**.
- Filter active vs archived at the service or query layer the same way `App.jsx` does today, so list endpoints for the board and epics never return archived rows unless explicitly requested.

---

## License

[MIT](LICENSE) — Copyright (c) 2026 Cliff Parker. Published under [Cliffinkent/Tasklane](https://github.com/Cliffinkent/Tasklane).

