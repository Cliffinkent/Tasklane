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
