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
