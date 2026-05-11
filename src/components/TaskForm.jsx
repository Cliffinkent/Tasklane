import { useState, useEffect } from 'react'
import {
  TASK_TYPES,
  PRIORITIES,
  normaliseTaskType,
  DEFAULT_TASK_TYPE,
} from '../data/taskMetadata'

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
  const [comments, setComments] = useState([])
  const [commentDraft, setCommentDraft] = useState('')
  const [commentError, setCommentError] = useState(false)

  function normaliseLocalComments(raw) {
    if (!Array.isArray(raw)) return []
    return raw
      .map((comment, index) => {
        if (!comment || typeof comment !== 'object') return null
        const body = String(comment.body ?? '').trim()
        if (!body) return null
        const now = new Date().toISOString()
        const id = String(comment.id ?? '').trim() || `comment-${index}-${now}`
        const createdAt =
          typeof comment.createdAt === 'string' && comment.createdAt.trim()
            ? comment.createdAt
            : now
        const updatedAt =
          typeof comment.updatedAt === 'string' && comment.updatedAt.trim()
            ? comment.updatedAt
            : createdAt
        return { id, body, createdAt, updatedAt }
      })
      .filter(Boolean)
  }

  function formatCommentTimestamp(value) {
    if (!value || typeof value !== 'string') return ''
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value
    return d.toLocaleString()
  }

  useEffect(() => {
    if (isEdit) {
      setTitle(initialTask.title ?? '')
      setDescription(initialTask.description ?? '')
      setEpicId(initialTask.epicId ?? '')
      setTaskType(
        normaliseTaskType(initialTask.taskType ?? '', DEFAULT_TASK_TYPE)
      )
      setPriority(initialTask.priority ?? 'Medium')
      setDueDate(typeof initialTask.dueDate === 'string' ? initialTask.dueDate : '')
      setOwner(initialTask.owner ?? '')
      setComments(normaliseLocalComments(initialTask.comments))
    } else {
      setTitle(draftDefaults?.title ?? '')
      setDescription(draftDefaults?.description ?? '')
      setEpicId(draftDefaults?.epicId ?? '')
      setTaskType(
        normaliseTaskType(
          draftDefaults?.taskType ?? '',
          DEFAULT_TASK_TYPE
        )
      )
      setPriority(draftDefaults?.priority ?? 'Medium')
      setDueDate(draftDefaults?.dueDate ?? '')
      setOwner(draftDefaults?.owner ?? '')
      setComments([])
    }
    setTitleError(false)
    setCommentDraft('')
    setCommentError(false)
  }, [initialTask, draftDefaults, isEdit])

  function resetCreateFields() {
    setTitle('')
    setDescription('')
    setEpicId('')
    setTaskType('Discovery')
    setPriority('Medium')
    setDueDate('')
    setOwner('')
    setComments([])
    setCommentDraft('')
    setCommentError(false)
  }

  function handleAddComment() {
    const body = commentDraft.trim()
    if (!body) {
      setCommentError(true)
      return
    }
    const now = new Date().toISOString()
    setComments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        body,
        createdAt: now,
        updatedAt: now,
      },
    ])
    setCommentDraft('')
    setCommentError(false)
  }

  function handleDeleteComment(commentId) {
    setComments((prev) => prev.filter((comment) => comment.id !== commentId))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      setTitleError(true)
      return
    }
    setTitleError(false)
    const payload = {
      title,
      description,
      epicId: epicId || '',
      taskType,
      priority,
      dueDate,
      owner,
    }
    if (isEdit) {
      payload.comments = comments
    }
    onSubmit(payload)
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
            <p id="task-title-error" className="form-error" role="alert">
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

      {isEdit ? (
        <section className="task-comments" aria-label="Comments">
          <h3 className="task-comments-heading">Comments</h3>
          {comments.length > 0 ? (
            <ul className="task-comments-list">
              {comments.map((comment) => (
                <li key={comment.id} className="task-comment-item">
                  <p className="task-comment-body">{comment.body}</p>
                  <div className="task-comment-meta">
                    <span>{formatCommentTimestamp(comment.createdAt)}</span>
                    <button
                      type="button"
                      className="task-comment-delete"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      Delete comment
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="task-comment-meta">No comments yet.</p>
          )}
          <div className="task-comment-add">
            <label className="task-form-label task-form-label--block" htmlFor="task-comment-input">
              Add comment
            </label>
            <textarea
              id="task-comment-input"
              className="task-form-textarea task-comment-textarea"
              placeholder="Add a comment or note"
              value={commentDraft}
              onChange={(e) => {
                setCommentDraft(e.target.value)
                if (commentError) setCommentError(false)
              }}
              rows={3}
            />
            {commentError ? (
              <p className="task-comment-error" role="alert">
                Comment cannot be empty.
              </p>
            ) : null}
            <div className="task-comment-actions">
              <button type="button" className="btn btn-secondary" onClick={handleAddComment}>
                Add comment
              </button>
            </div>
          </div>
        </section>
      ) : null}

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
