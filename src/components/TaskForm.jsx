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
