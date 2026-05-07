import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { COLUMNS } from '../data/columns'
import { normaliseTaskType, DEFAULT_TASK_TYPE } from '../data/taskMetadata'
import { formatDateLabel } from '../utils/formatDateLabel'

const columnRank = (() => {
  const m = new Map(COLUMNS.map((c, i) => [c.id, i]))
  return (columnId) => m.get(columnId) ?? 999
})()

function priorityVariant(priority) {
  switch (priority) {
    case 'Low':
      return 'low'
    case 'High':
      return 'high'
    case 'Critical':
      return 'critical'
    default:
      return 'medium'
  }
}

export default function EpicDetailPage({
  epics,
  tasks,
  onUpdateEpic,
  onRepositionTask,
}) {
  const { epicId } = useParams()
  const epic = epics.find((e) => e.id === epicId)
  const [name, setName] = useState(epic?.name ?? '')
  const [description, setDescription] = useState(epic?.description ?? '')
  const [nameError, setNameError] = useState(false)

  useEffect(() => {
    setName(epic?.name ?? '')
    setDescription(epic?.description ?? '')
    setNameError(false)
  }, [epic])

  const linkedTasks = useMemo(() => {
    const list = tasks.filter((task) => task.epicId === epicId)
    return [...list].sort((a, b) => {
      const cr = columnRank(a.columnId) - columnRank(b.columnId)
      if (cr !== 0) return cr
      const o = (Number(a.order) || 0) - (Number(b.order) || 0)
      if (o !== 0) return o
      return String(a.id).localeCompare(String(b.id))
    })
  }, [tasks, epicId])

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
    if (!nextName) {
      setNameError(true)
      return
    }
    setNameError(false)
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
        Update this epic and review linked tasks.
      </p>

      <form className="epic-form epic-detail-edit-form" onSubmit={handleSave} noValidate>
        <h3 className="surface-form-heading">Edit epic</h3>
        <div className="template-form-field">
          <label
            className="task-form-label task-form-label--block"
            htmlFor="epic-detail-name"
          >
            Epic name
          </label>
          <input
            id="epic-detail-name"
            type="text"
            className="task-form-input"
            placeholder="Epic name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (nameError) setNameError(false)
            }}
            aria-invalid={nameError}
            aria-describedby={nameError ? 'epic-detail-name-err' : undefined}
            autoComplete="off"
          />
          {nameError ? (
            <p id="epic-detail-name-err" className="form-error" role="alert">
              Epic name is required.
            </p>
          ) : null}
        </div>
        <div className="template-form-field">
          <label
            className="task-form-label task-form-label--block"
            htmlFor="epic-detail-desc"
          >
            Description (optional)
          </label>
          <textarea
            id="epic-detail-desc"
            className="task-form-textarea"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <div className="task-form-actions">
          <button type="submit" className="btn btn-primary">
            Save epic
          </button>
        </div>
      </form>

      <section className="epic-linked-tasks" aria-labelledby="epic-linked-tasks-heading">
        <h3 id="epic-linked-tasks-heading" className="page-section-heading">
          Linked tasks
        </h3>
        {linkedTasks.length === 0 ? (
          <div className="empty-state" role="status">
            <div className="empty-state-inner">
              <div className="empty-state-panel">
                <p className="empty-state-message">
                  No tasks are linked to this epic yet.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <ul className="epic-task-list">
            {linkedTasks.map((task) => {
              const dueRaw =
                typeof task.dueDate === 'string' && task.dueDate.trim()
                  ? task.dueDate.trim()
                  : ''
              const dueStr = dueRaw ? formatDateLabel(dueRaw) : null
              const ownerStr =
                typeof task.owner === 'string' && task.owner.trim()
                  ? task.owner.trim()
                  : null
              return (
              <li key={task.id} className="epic-task-item">
                <div className="epic-task-body">
                  <div className="card-badges epic-detail-badges">
                    <span className="task-type-badge">
                      {normaliseTaskType(
                        task.taskType ?? '',
                        DEFAULT_TASK_TYPE
                      )}
                    </span>
                    <span
                      className={`priority-badge priority-badge--${priorityVariant(task.priority ?? 'Medium')}`}
                    >
                      {task.priority ?? 'Medium'}
                    </span>
                  </div>
                  <p className="epic-task-title">{task.title}</p>
                  {task.description ? (
                    <p className="epic-task-description">{task.description}</p>
                  ) : null}
                  {dueStr || ownerStr ? (
                    <div className="card-meta">
                      {dueStr ? (
                        <span className="card-meta-item card-meta-item--due">
                          <span className="card-meta-label">Due</span> {dueStr}
                        </span>
                      ) : null}
                      {ownerStr ? (
                        <span className="card-meta-item card-meta-item--owner">
                          <span className="card-meta-label">Owner</span> {ownerStr}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <label className="epic-task-status">
                  <span className="task-form-label">Status</span>
                  <select
                    className="task-form-select"
                    value={task.columnId}
                    onChange={(e) =>
                      onRepositionTask(task.id, e.target.value)
                    }
                  >
                    {COLUMNS.map((column) => (
                      <option key={column.id} value={column.id}>
                        {column.title}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
