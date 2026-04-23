import { useState, useEffect } from 'react'

export default function TaskForm({ onSubmit, onCancel, initialTask }) {
  const [title, setTitle] = useState(initialTask?.title ?? '')
  const [description, setDescription] = useState(initialTask?.description ?? '')

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title ?? '')
      setDescription(initialTask.description ?? '')
    }
  }, [initialTask])

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({ title, description })
    if (!initialTask) {
      setTitle('')
      setDescription('')
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
