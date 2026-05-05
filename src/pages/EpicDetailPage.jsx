import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { COLUMNS } from '../data/columns'

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

  useEffect(() => {
    setName(epic?.name ?? '')
    setDescription(epic?.description ?? '')
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
            {linkedTasks.map((task) => {
              const dueStr =
                typeof task.dueDate === 'string' && task.dueDate.trim()
                  ? task.dueDate.trim()
                  : null
              const ownerStr =
                typeof task.owner === 'string' && task.owner.trim()
                  ? task.owner.trim()
                  : null
              return (
              <li key={task.id} className="epic-task-item">
                <div className="epic-task-body">
                  <div className="card-badges epic-detail-badges">
                    <span className="task-type-badge">
                      {task.taskType ?? 'Discovery'}
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
                    <div className="card-meta epic-task-inline-meta">
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
