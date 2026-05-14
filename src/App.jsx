import { useRef, useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useEpicsStorage } from './hooks/useEpicsStorage'
import { useTemplatesStorage } from './hooks/useTemplatesStorage'
import { useTheme } from './hooks/useTheme'
import AppLayout from './components/AppLayout'
import Board from './components/Board'
import EpicsPage from './pages/EpicsPage'
import EpicDetailPage from './pages/EpicDetailPage'
import TemplatesPage from './pages/TemplatesPage'
import DropZone from './pages/DropZone'
import { COLUMN_IDS } from './data/columns'
import {
  normaliseTaskType,
  PRIORITY_SET,
  DEFAULT_PRIORITY,
} from './data/taskMetadata'
import './App.css'

const UNDO_MS = 5000

function resolveTaskType(incoming, current) {
  const currentNorm = normaliseTaskType(
    typeof current === 'string' ? current : ''
  )
  if (incoming === undefined) return currentNorm
  return normaliseTaskType(
    typeof incoming === 'string' ? incoming : '',
    currentNorm
  )
}

function resolvePriority(incoming, current) {
  if (incoming === undefined) return current
  if (PRIORITY_SET.has(incoming)) return incoming
  return current
}

function resolveEpicId(epicId, epics) {
  if (epicId == null || epicId === '') return null
  return epics.some((e) => e.id === epicId) ? epicId : null
}

function parseCommentTimestamp(value, fallback) {
  if (typeof value === 'string' && value.trim() && Number.isFinite(Date.parse(value))) {
    return value
  }
  return fallback
}

function normaliseCommentInput(comment, index, taskId, fallbackNow) {
  if (!comment || typeof comment !== 'object') return null
  const body = String(comment.body ?? '').trim()
  if (!body) return null
  const rawId = String(comment.id ?? '').trim()
  const id = rawId || `${taskId}-comment-${index}`
  const createdAt = parseCommentTimestamp(comment.createdAt, fallbackNow)
  const updatedAt = parseCommentTimestamp(comment.updatedAt, createdAt)
  return { id, body, createdAt, updatedAt }
}

function normaliseCommentsInput(comments, taskId, fallbackNow) {
  if (!Array.isArray(comments)) return []
  return comments
    .map((comment, index) =>
      normaliseCommentInput(comment, index, taskId, fallbackNow)
    )
    .filter(Boolean)
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

/** Build one backlog task from import payload (preview row without source). epicId always null as per import spec. */
function createTaskFromImportInput(input, order, now) {
  const trimmedTitle = String(input.title ?? '').trim()
  if (!trimmedTitle) return null
  const taskType = normaliseTaskType(
    typeof input.taskType === 'string' ? input.taskType : ''
  )
  const priority = PRIORITY_SET.has(input.priority)
    ? input.priority
    : DEFAULT_PRIORITY
  const dueDate =
    typeof input.dueDate === 'string' ? input.dueDate.trim() : ''
  const owner = String(input.owner ?? '').trim()
  return {
    id: crypto.randomUUID(),
    title: trimmedTitle,
    description: String(input.description ?? '').trim(),
    columnId: 'backlog',
    epicId: null,
    createdAt: now,
    updatedAt: now,
    order,
    taskType,
    priority,
    dueDate,
    owner,
    comments: [],
  }
}

/** Next append order for a column (max + 1). */
function getNextOrderForColumn(tasks, columnId) {
  const inCol = tasks.filter((t) => t.columnId === columnId)
  if (inCol.length === 0) return 0
  let max = -1
  for (const t of inCol) {
    const o = Number(t.order)
    if (Number.isFinite(o) && o > max) max = o
  }
  return max + 1
}

/** Reassign sequential `order` (0..n-1) per column; bump `updatedAt` when order changes. */
function normaliseColumnOrders(tasks, columnIds, now) {
  const colSet = new Set(columnIds)
  let result = tasks.map((t) => ({ ...t }))

  for (const col of colSet) {
    const inCol = result
      .filter((t) => t.columnId === col)
      .sort(
        (a, b) =>
          (Number(a.order) || 0) - (Number(b.order) || 0) ||
          String(a.id).localeCompare(String(b.id))
      )
    const newOrderById = new Map(inCol.map((t, i) => [t.id, i]))
    result = result.map((t) => {
      if (t.columnId !== col) return t
      const ord = newOrderById.get(t.id)
      if (ord === undefined) return t
      if (t.order === ord) return t
      return { ...t, order: ord, updatedAt: now }
    })
  }

  return result
}

/**
 * Move active task before target task (same column) or into target column (append / insert).
 * @param {Set<string>} columnIdSet
 */
function repositionTask(tasks, activeTaskId, overId, columnIdSet, now) {
  if (!activeTaskId || activeTaskId === overId) return tasks

  const active = tasks.find((t) => t.id === activeTaskId)
  if (!active) return tasks

  const isColumn = columnIdSet.has(overId)
  const overTask = !isColumn ? tasks.find((t) => t.id === overId) : null
  if (!isColumn && !overTask) return tasks

  const oldCol = active.columnId
  const targetCol = isColumn ? overId : overTask.columnId

  const withoutActive = tasks.filter((t) => t.id !== activeTaskId)
  const colTasks = withoutActive
    .filter((t) => t.columnId === targetCol)
    .sort(
      (a, b) =>
        (Number(a.order) || 0) - (Number(b.order) || 0) ||
        String(a.id).localeCompare(String(b.id))
    )

  let insertAt
  if (isColumn) {
    insertAt = colTasks.length
  } else {
    const i = colTasks.findIndex((t) => t.id === overId)
    insertAt = i < 0 ? colTasks.length : i
  }

  const moved = { ...active, columnId: targetCol, updatedAt: now }
  const mergedCol = [...colTasks.slice(0, insertAt), moved, ...colTasks.slice(insertAt)].map(
    (t, idx) => ({
      ...t,
      columnId: targetCol,
      order: idx,
      updatedAt: now,
    })
  )

  const rest = withoutActive.filter((t) => t.columnId !== targetCol)
  let next = [...rest, ...mergedCol]

  const cols = new Set([targetCol])
  if (oldCol !== targetCol) cols.add(oldCol)
  next = normaliseColumnOrders(next, [...cols], now)
  return next
}

function App() {
  const [tasks, setTasks] = useLocalStorage()
  const [epics, setEpics] = useEpicsStorage()
  const [templates, setTemplates] = useTemplatesStorage()
  const [theme, toggleTheme] = useTheme()
  const [deletedForUndo, setDeletedForUndo] = useState(null)
  const [taskdropToast, setTaskdropToast] = useState(null)
  const undoTimerRef = useRef(null)
  const handleCreateTasksRef = useRef(null)

  function handleCreate(data) {
    const trimmed = (data.title || '').trim()
    if (!trimmed) return false
    const epicId = resolveEpicId(data.epicId, epics)
    const now = new Date().toISOString()
    setTasks((prev) => {
      const order = getNextOrderForColumn(prev, 'backlog')
      const taskType = normaliseTaskType(
        typeof data.taskType === 'string' ? data.taskType : ''
      )
      const priority = PRIORITY_SET.has(data.priority)
        ? data.priority
        : DEFAULT_PRIORITY
      const dueDate =
        typeof data.dueDate === 'string' ? data.dueDate : ''
      const owner = (data.owner || '').trim()
      const task = {
        id: crypto.randomUUID(),
        title: trimmed,
        description: (data.description || '').trim(),
        columnId: 'backlog',
        epicId,
        createdAt: now,
        updatedAt: now,
        order,
        taskType,
        priority,
        dueDate,
        owner,
        comments: [],
      }
      return [...prev, task]
    })
    return true
  }

  /** Create multiple tasks in backlog in one atomic update; order appended after existing backlog. Returns count created. */
  function handleCreateTasks(items) {
    const list = Array.isArray(items) ? items : []
    const now = new Date().toISOString()
    const createdCount = list.filter((item) =>
      String(item.title ?? '').trim()
    ).length
    setTasks((prev) => {
      let order = getNextOrderForColumn(prev, 'backlog')
      const newTasks = []
      for (const item of list) {
        const row = createTaskFromImportInput(item, order, now)
        if (!row) continue
        newTasks.push(row)
        order += 1
      }
      return newTasks.length ? [...prev, ...newTasks] : prev
    })
    return createdCount
  }

  handleCreateTasksRef.current = handleCreateTasks

  function handleRepositionTask(activeTaskId, overId) {
    setTasks((prev) => {
      const now = new Date().toISOString()
      return repositionTask(prev, activeTaskId, overId, COLUMN_IDS, now)
    })
  }

  function handleUpdate(
    taskId,
    { title, description, epicId, taskType, priority, dueDate, owner, comments }
  ) {
    const nextEpicId = resolveEpicId(epicId, epics)
    const now = new Date().toISOString()
    let didUpdate = false
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t
        const trimmedTitle = (title ?? t.title).trim()
        if (!trimmedTitle) return t
        didUpdate = true
        const currentPriority = t.priority ?? DEFAULT_PRIORITY
        const currentComments = Array.isArray(t.comments) ? t.comments : []
        const nextComments =
          comments === undefined
            ? currentComments
            : normaliseCommentsInput(comments, t.id, now)
        return {
          ...t,
          title: trimmedTitle,
          description: (description ?? t.description ?? '').trim(),
          epicId:
            epicId === '' || epicId === null || epicId === undefined
              ? null
              : nextEpicId,
          taskType: resolveTaskType(taskType, t.taskType),
          priority: resolvePriority(priority, currentPriority),
          dueDate:
            dueDate === undefined
              ? (t.dueDate ?? '')
              : String(dueDate ?? ''),
          owner:
            owner === undefined ? (t.owner ?? '') : String(owner ?? '').trim(),
          comments: nextComments,
          updatedAt: now,
        }
      })
    )
    return didUpdate
  }

  function handleCreateEpic({ name, description }) {
    const n = (name || '').trim()
    if (!n) return
    const now = new Date().toISOString()
    setEpics((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: n,
        description: (description || '').trim(),
        createdAt: now,
        updatedAt: now,
      },
    ])
  }

  function handleDeleteEpic(epicId) {
    const now = new Date().toISOString()
    setEpics((prev) => prev.filter((e) => e.id !== epicId))
    setTasks((prev) =>
      prev.map((t) =>
        t.epicId === epicId ? { ...t, epicId: null, updatedAt: now } : t
      )
    )
  }

  function handleUpdateEpic(epicId, { name, description }) {
    const now = new Date().toISOString()
    setEpics((prev) =>
      prev.map((epic) => {
        if (epic.id !== epicId) return epic
        const trimmedName = (name ?? epic.name).trim()
        if (!trimmedName) return epic
        return {
          ...epic,
          name: trimmedName,
          description: (description ?? epic.description ?? '').trim(),
          updatedAt: now,
        }
      })
    )
  }

  function handleReorderEpics(fromId, toId) {
    setEpics((prev) => reorderById(prev, fromId, toId))
  }

  function handleCreateTemplate(data) {
    const title = (data.title || '').trim()
    if (!title) return false
    let label = (data.label || '').trim()
    if (!label) label = title
    const now = new Date().toISOString()
    const taskType = normaliseTaskType(
      typeof data.taskType === 'string' ? data.taskType : ''
    )
    const priority = PRIORITY_SET.has(data.priority)
      ? data.priority
      : DEFAULT_PRIORITY
    setTemplates((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label,
        title,
        description: (data.description || '').trim(),
        taskType,
        priority,
        dueDate: typeof data.dueDate === 'string' ? data.dueDate : '',
        owner: (data.owner || '').trim(),
        createdAt: now,
        updatedAt: now,
      },
    ])
    return true
  }

  function handleUpdateTemplate(templateId, data) {
    const now = new Date().toISOString()
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== templateId) return t
        const nextTitle = (data.title ?? t.title).trim()
        if (!nextTitle) return t
        let label = (data.label ?? t.label).trim()
        if (!label) label = nextTitle
        const priorType = normaliseTaskType(
          typeof t.taskType === 'string' ? t.taskType : ''
        )
        const taskType = normaliseTaskType(
          typeof data.taskType === 'string' ? data.taskType : priorType,
          priorType
        )
        const priority = PRIORITY_SET.has(data.priority)
          ? data.priority
          : t.priority
        return {
          ...t,
          label,
          title: nextTitle,
          description: (data.description ?? t.description ?? '').trim(),
          taskType,
          priority,
          dueDate:
            data.dueDate === undefined
              ? (t.dueDate ?? '')
              : String(data.dueDate ?? ''),
          owner:
            data.owner === undefined
              ? (t.owner ?? '')
              : String(data.owner ?? '').trim(),
          updatedAt: now,
        }
      })
    )
  }

  function handleDeleteTemplate(templateId) {
    setTemplates((prev) => prev.filter((t) => t.id !== templateId))
  }

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!taskdropToast) return undefined
    const t = setTimeout(() => setTaskdropToast(null), 5000)
    return () => clearTimeout(t)
  }, [taskdropToast])

  useEffect(() => {
    const api =
      typeof window !== 'undefined' ? window.tasklaneImportBridge : null
    if (!api?.onPendingImport) {
      const inElectron =
        typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent)
      if (inElectron) {
        console.warn(
          '[Tasklane import] window.tasklaneImportBridge is missing — preload may have failed to load. File import will not work until this is fixed.'
        )
      }
      return undefined
    }
    const unsub = api.onPendingImport((payload) => {
      const filePath =
        typeof payload?.filePath === 'string' ? payload.filePath : ''
      const items = payload?.items
      let n = 0
      try {
        n = handleCreateTasksRef.current?.(items) ?? 0
      } catch (err) {
        console.warn('[Tasklane import] Failed to create tasks from file', err)
      } finally {
        if (filePath) {
          if (n > 0) {
            setTaskdropToast(`Imported ${n} tasks from Taskdrop`)
          }
          api.notifyImportHandled({ filePath, success: n > 0 })
        } else {
          console.warn('[Tasklane import] Ignoring import payload without filePath')
        }
      }
    })
    return unsub
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
    if (
      !window.confirm(
        `Delete “${label}”? You can undo this for a few seconds.`
      )
    ) {
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
                templates={templates}
                onCreateTask={handleCreate}
                onCreateTasks={handleCreateTasks}
                onRepositionTask={handleRepositionTask}
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
                onRepositionTask={handleRepositionTask}
              />
            }
          />
          <Route
            path="templates"
            element={
              <TemplatesPage
                templates={templates}
                onCreateTemplate={handleCreateTemplate}
                onUpdateTemplate={handleUpdateTemplate}
                onDeleteTemplate={handleDeleteTemplate}
              />
            }
          />
          <Route path="dropzone" element={<DropZone tasks={tasks} />} />
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
      {taskdropToast && (
        <div className="taskdrop-import-toast" role="status">
          <span className="taskdrop-import-toast-message">{taskdropToast}</span>
        </div>
      )}
    </>
  )
}

export default App
