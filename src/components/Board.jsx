import { useState, useEffect, useMemo } from 'react'
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
import { TASK_TYPES, PRIORITIES } from '../data/taskMetadata'
import Column from './Column'
import TaskForm from './TaskForm'
import Card, { CardContent } from './Card'

function sortTasksByOrder(tasks) {
  return [...tasks].sort(
    (a, b) =>
      (Number(a.order) || 0) - (Number(b.order) || 0) ||
      String(a.id).localeCompare(String(b.id))
  )
}

/** Map droppable id `drop:<taskId>` back to task id for reposition logic. */
function normaliseDropOverId(id) {
  const s = String(id)
  return s.startsWith('drop:') ? s.slice(5) : s
}

function filterBoardTasks(tasks, filters) {
  const { search, status, epic, taskType, priority } = filters
  const needle = search.trim().toLowerCase()
  return tasks.filter((t) => {
    if (status !== 'all' && t.columnId !== status) return false
    if (epic === 'none' && t.epicId) return false
    if (epic !== 'all' && epic !== 'none' && t.epicId !== epic) return false
    if (taskType !== 'all' && (t.taskType ?? 'Discovery') !== taskType) {
      return false
    }
    if (priority !== 'all' && (t.priority ?? 'Medium') !== priority) {
      return false
    }
    if (needle) {
      const title = (t.title || '').toLowerCase()
      const desc = (t.description || '').toLowerCase()
      const owner = (t.owner || '').toLowerCase()
      if (
        !title.includes(needle) &&
        !desc.includes(needle) &&
        !owner.includes(needle)
      ) {
        return false
      }
    }
    return true
  })
}

export default function Board({
  tasks,
  epics,
  templates = [],
  onCreateTask,
  onRepositionTask,
  onUpdateTask,
  onDeleteTask,
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [draftDefaults, setDraftDefaults] = useState(null)
  const [templateSelectKey, setTemplateSelectKey] = useState(0)
  const [createFormNonce, setCreateFormNonce] = useState(0)
  const [activeId, setActiveId] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [epicFilter, setEpicFilter] = useState('all')
  const [taskTypeFilter, setTaskTypeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const modalOpen = showForm || Boolean(editingTaskId)

  const filters = useMemo(
    () => ({
      search,
      status: statusFilter,
      epic: epicFilter,
      taskType: taskTypeFilter,
      priority: priorityFilter,
    }),
    [search, statusFilter, epicFilter, taskTypeFilter, priorityFilter]
  )

  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(search.trim()) ||
      statusFilter !== 'all' ||
      epicFilter !== 'all' ||
      taskTypeFilter !== 'all' ||
      priorityFilter !== 'all'
    )
  }, [search, statusFilter, epicFilter, taskTypeFilter, priorityFilter])

  const filteredTasks = useMemo(
    () => filterBoardTasks(tasks, filters),
    [tasks, filters]
  )

  const visibleByColumn = useMemo(() => {
    const map = Object.fromEntries(COLUMNS.map((c) => [c.id, []]))
    for (const t of filteredTasks) {
      if (map[t.columnId]) map[t.columnId].push(t)
    }
    for (const col of COLUMNS) {
      map[col.id] = sortTasksByOrder(map[col.id])
    }
    return map
  }, [filteredTasks])

  function closeTaskModal() {
    setShowForm(false)
    setEditingTaskId(null)
    setDraftDefaults(null)
  }

  function openBlankCreate() {
    setDraftDefaults(null)
    setEditingTaskId(null)
    setCreateFormNonce((n) => n + 1)
    setShowForm(true)
  }

  function handleTemplateSelect(e) {
    const id = e.target.value
    setTemplateSelectKey((k) => k + 1)
    if (!id) return
    const tmpl = templates.find((t) => t.id === id)
    if (!tmpl) return
    setEditingTaskId(null)
    setCreateFormNonce((n) => n + 1)
    setDraftDefaults({
      templateId: tmpl.id,
      title: tmpl.title,
      description: tmpl.description ?? '',
      taskType: tmpl.taskType,
      priority: tmpl.priority,
      dueDate: typeof tmpl.dueDate === 'string' ? tmpl.dueDate : '',
      owner: typeof tmpl.owner === 'string' ? tmpl.owner : '',
    })
    setShowForm(true)
  }

  useEffect(() => {
    if (editingTaskId && !tasks.some((t) => t.id === editingTaskId)) {
      setEditingTaskId(null)
    }
  }, [tasks, editingTaskId])

  useEffect(() => {
    if (!modalOpen) return
    function onKeyDown(e) {
      if (e.key === 'Escape') closeTaskModal()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modalOpen])

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
      const overId = normaliseDropOverId(over.id)
      if (String(active.id) !== overId) {
        onRepositionTask(String(active.id), overId)
      }
    }
  }

  function clearFilters() {
    setSearch('')
    setStatusFilter('all')
    setEpicFilter('all')
    setTaskTypeFilter('all')
    setPriorityFilter('all')
  }

  const formKey = editingTaskId
    ? `edit-${editingTaskId}`
    : `create-${createFormNonce}-${draftDefaults?.templateId ?? 'blank'}`

  return (
    <div className="board">
      <header className="board-header">
        <div className="board-actions-row board-actions-row--with-templates">
          <div className="board-primary-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={openBlankCreate}
            >
              Add task
            </button>
            <label className="template-picker" htmlFor="migration-template-select">
              <span className="sr-only">Use template</span>
              <select
                key={templateSelectKey}
                id="migration-template-select"
                className="template-picker-select"
                defaultValue=""
                disabled={templates.length === 0}
                onChange={handleTemplateSelect}
                aria-label="Use migration task template"
              >
                <option value="">
                  {templates.length === 0 ? 'No templates' : 'Use template...'}
                </option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.label || tpl.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="board-results-summary" aria-live="polite">
            Showing {filteredTasks.length} of {tasks.length} tasks
          </p>
        </div>
        <div className="board-filters" role="search" aria-label="Board filters">
          <input
            type="search"
            className="board-filter-input"
            placeholder="Search tasks"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search tasks"
          />
          <select
            className="board-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            {COLUMNS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <select
            className="board-filter-select"
            value={epicFilter}
            onChange={(e) => setEpicFilter(e.target.value)}
            aria-label="Filter by epic"
          >
            <option value="all">All epics</option>
            <option value="none">No epic</option>
            {epics.map((epic) => (
              <option key={epic.id} value={epic.id}>
                {epic.name}
              </option>
            ))}
          </select>
          <select
            className="board-filter-select"
            value={taskTypeFilter}
            onChange={(e) => setTaskTypeFilter(e.target.value)}
            aria-label="Filter by task type"
          >
            <option value="all">All task types</option>
            {TASK_TYPES.map((tt) => (
              <option key={tt} value={tt}>
                {tt}
              </option>
            ))}
          </select>
          <select
            className="board-filter-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Filter by priority"
          >
            <option value="all">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-ghost board-clear-filters"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
          >
            Clear filters
          </button>
        </div>
      </header>

      {modalOpen && (
        <div
          className="board-form-overlay"
          role="presentation"
          onClick={closeTaskModal}
        >
          <div
            className="board-form-panel board-form-panel--migration"
            role="dialog"
            aria-modal="true"
            aria-labelledby="board-task-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="board-task-dialog-title" className="board-modal-title">
              {editingTaskId ? 'Edit task' : 'Add task'}
            </h2>
            <TaskForm
              key={formKey}
              epics={epics}
              initialTask={
                editingTaskId
                  ? tasks.find((t) => t.id === editingTaskId)
                  : undefined
              }
              draftDefaults={showForm && !editingTaskId ? draftDefaults : undefined}
              onSubmit={(data) => {
                if (editingTaskId) {
                  if (onUpdateTask(editingTaskId, data)) closeTaskModal()
                } else if (showForm) {
                  if (onCreateTask(data)) closeTaskModal()
                }
              }}
              onCancel={closeTaskModal}
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
          {COLUMNS.map((column) => {
            const totalInColumn = tasks.filter(
              (t) => t.columnId === column.id
            ).length
            return (
              <Column
                key={column.id}
                columnId={column.id}
                title={column.title}
                tasks={visibleByColumn[column.id] || []}
                totalInColumn={totalInColumn}
                filterActive={hasActiveFilters}
                epics={epics}
                onRepositionTask={onRepositionTask}
                onEditTask={(id) => {
                  setDraftDefaults(null)
                  setEditingTaskId(id)
                }}
                onDeleteTask={onDeleteTask}
              />
            )
          })}
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
