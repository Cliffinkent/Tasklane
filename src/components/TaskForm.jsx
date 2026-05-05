import { useState, useEffect } from 'react'
import { TASK_TYPES, PRIORITIES } from '../data/taskMetadata'

export default function TaskForm({
  onSubmit,
  onCancel,
  initialTask,
  draftDefaults,
  epics = [],
}) {
  const isEdit = Boolean(initialTask?.id)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [epicId, setEpicId] = useState('')
  const [taskType, setTaskType] = useState('Discovery')
  const [priority, setPriority] = useState('Medium')
  const [dueDate, setDueDate] = useState('')
  const [owner, setOwner] = useState('')
  const [titleError, setTitleError] = useState(false)

  useEffect(() => {
    if (isEdit) {
      setTitle(initialTask.title ?? '')
      setDescription(initialTask.description ?? '')
      setEpicId(initialTask.epicId ?? '')
      setTaskType(initialTask.taskType ?? 'Discovery')
      setPriority(initialTask.priority ?? 'Medium')
      setDueDate(typeof initialTask.dueDate === 'string' ? initialTask.dueDate : '')
      setOwner(initialTask.owner ?? '')
    } else {
      setTitle(draftDefaults?.title ?? '')
      setDescription(draftDefaults?.description ?? '')
      setEpicId(draftDefaults?.epicId ?? '')
      setTaskType(draftDefaults?.taskType ?? 'Discovery')
      setPriority(draftDefaults?.priority ?? 'Medium')
      setDueDate(draftDefaults?.dueDate ?? '')
      setOwner(draftDefaults?.owner ?? '')
    }
    setTitleError(false)
  }, [initialTask, draftDefaults, isEdit])

  function resetCreateFields() {
    setTitle('')
    setDescription('')
    setEpicId('')
    setTaskType('Discovery')
    setPriority('Medium')
    setDueDate('')
    setOwner('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      setTitleError(true)
      return
    }
    setTitleError(false)
    onSubmit({
      title,
      description,
      epicId: epicId || '',
      taskType,
      priority,
      dueDate,
      owner,
    })
    if (!isEdit) {
      resetCreateFields()
    }
  }

  const showTitleError = titleError

  return (
    <form className="task-form" onSubmit={handleSubmit} noValidate>
      <div className="task-form-grid">
        <div className="task-form-field task-form-field--full">
          <label className="task-form-label task-form-label--block" htmlFor="task-form-title">
            Title
          </label>
          <input
            id="task-form-title"
            type="text"
            placeholder="Task title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (titleError) setTitleError(false)
            }}
            className="task-form-input"
            autoFocus
            required
            aria-invalid={showTitleError}
            aria-describedby={showTitleError ? 'task-title-error' : undefined}
          />
          {showTitleError ? (
            <p id="task-title-error" className="task-form-inline-error" role="alert">
              Task title is required.
            </p>
          ) : null}
        </div>

        <div className="task-form-field task-form-field--full">
          <label className="task-form-label task-form-label--block" htmlFor="task-form-description">
            Description
          </label>
          <textarea
            id="task-form-description"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="task-form-textarea"
            rows={3}
          />
        </div>

        <div className="task-form-field">
          <label className="task-form-label task-form-label--block" htmlFor="task-form-type">
            Task type
          </label>
          <select
            id="task-form-type"
            className="task-form-select"
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
          >
            {TASK_TYPES.map((tt) => (
              <option key={tt} value={tt}>
                {tt}
              </option>
            ))}
          </select>
        </div>

        <div className="task-form-field">
          <label className="task-form-label task-form-label--block" htmlFor="task-form-priority">
            Priority
          </label>
          <select
            id="task-form-priority"
            className="task-form-select"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="task-form-field">
          <label className="task-form-label task-form-label--block" htmlFor="task-form-due">
            Due date
          </label>
          <input
            id="task-form-due"
            type="date"
            className="task-form-input task-form-input--date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div className="task-form-field">
          <label className="task-form-label task-form-label--block" htmlFor="task-form-owner">
            Owner
          </label>
          <input
            id="task-form-owner"
            type="text"
            className="task-form-input"
            placeholder="Name or team"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          />
        </div>

        <div className="task-form-field task-form-field--full">
          <label className="task-form-label task-form-label--block" htmlFor="task-epic">
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
        </div>
      </div>

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
