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
  const [nameError, setNameError] = useState(false)
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
    if (!n) {
      setNameError(true)
      return
    }
    setNameError(false)
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
      <form className="epic-form" onSubmit={handleSubmit} noValidate>
        <h3 className="surface-form-heading">New epic</h3>
        <div className="template-form-field">
          <label
            className="task-form-label task-form-label--block"
            htmlFor="epic-create-name"
          >
            Epic name
          </label>
          <input
            id="epic-create-name"
            type="text"
            className="task-form-input"
            placeholder="Epic name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (nameError) setNameError(false)
            }}
            aria-invalid={nameError}
            aria-describedby={nameError ? 'epic-create-name-err' : undefined}
            autoComplete="off"
          />
          {nameError ? (
            <p id="epic-create-name-err" className="form-error" role="alert">
              Epic name is required.
            </p>
          ) : null}
        </div>
        <div className="template-form-field">
          <label
            className="task-form-label task-form-label--block"
            htmlFor="epic-create-desc"
          >
            Description (optional)
          </label>
          <textarea
            id="epic-create-desc"
            className="task-form-textarea"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>
        <div className="task-form-actions">
          <button type="submit" className="btn btn-primary">
            Create epic
          </button>
        </div>
      </form>
      <section className="epics-list-section" aria-labelledby="epics-list-heading">
        <h3 id="epics-list-heading" className="page-section-heading">
          All epics ({epics.length})
        </h3>
        {epics.length > 1 ? (
          <p className="epics-hint">Drag epics to reorder them.</p>
        ) : null}
        {epics.length === 0 ? (
          <div className="empty-state" role="status">
            <div className="empty-state-inner">
              <div className="empty-state-panel">
                <p className="empty-state-message">
                  No epics yet. Create one to group related work.
                </p>
              </div>
            </div>
          </div>
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
                    <span
                      className="epics-drag-handle"
                      aria-hidden
                      title="Drag to reorder"
                    />
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
                    className="btn btn-ghost btn--danger-quiet epics-list-delete"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete epic “${epic.name}”? Linked tasks will remain, but they will no longer be assigned to this epic.`
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
