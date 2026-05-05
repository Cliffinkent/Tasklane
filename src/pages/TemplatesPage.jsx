import { useState } from 'react'
import { TASK_TYPES, PRIORITIES } from '../data/taskMetadata'

function priorityVariant(p) {
  switch (p) {
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

function CreateTemplateForm({ onCreate }) {
  const [label, setLabel] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [taskType, setTaskType] = useState('Discovery')
  const [priority, setPriority] = useState('Medium')
  const [dueDate, setDueDate] = useState('')
  const [owner, setOwner] = useState('')
  const [titleError, setTitleError] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) {
      setTitleError(true)
      return
    }
    setTitleError(false)
    onCreate({
      label,
      title,
      description,
      taskType,
      priority,
      dueDate,
      owner,
    })
    setLabel('')
    setTitle('')
    setDescription('')
    setTaskType('Discovery')
    setPriority('Medium')
    setDueDate('')
    setOwner('')
  }

  const showErr = titleError

  return (
    <form className="template-form" onSubmit={handleSubmit} noValidate>
      <h3 className="epic-form-heading">New template</h3>
      <div className="template-form-grid">
        <div className="template-form-field">
          <label className="task-form-label task-form-label--block" htmlFor="tpl-create-label">
            Label
          </label>
          <input
            id="tpl-create-label"
            type="text"
            className="task-form-input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Short name in lists"
          />
        </div>
        <div className="template-form-field template-form-field--full">
          <label className="task-form-label task-form-label--block" htmlFor="tpl-create-title">
            Task title
          </label>
          <input
            id="tpl-create-title"
            type="text"
            className="task-form-input"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (titleError) setTitleError(false)
            }}
            aria-invalid={showErr}
            aria-describedby={showErr ? 'tpl-create-title-err' : undefined}
            required
          />
          {showErr ? (
            <p id="tpl-create-title-err" className="form-error" role="alert">
              Template task title is required.
            </p>
          ) : null}
        </div>
        <div className="template-form-field template-form-field--full">
          <label className="task-form-label task-form-label--block" htmlFor="tpl-create-desc">
            Description
          </label>
          <textarea
            id="tpl-create-desc"
            className="task-form-textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="template-form-field">
          <label className="task-form-label task-form-label--block" htmlFor="tpl-create-type">
            Task type
          </label>
          <select
            id="tpl-create-type"
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
        <div className="template-form-field">
          <label className="task-form-label task-form-label--block" htmlFor="tpl-create-pri">
            Priority
          </label>
          <select
            id="tpl-create-pri"
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
        <div className="template-form-field">
          <label className="task-form-label task-form-label--block" htmlFor="tpl-create-due">
            Due date
          </label>
          <input
            id="tpl-create-due"
            type="date"
            className="task-form-input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div className="template-form-field">
          <label className="task-form-label task-form-label--block" htmlFor="tpl-create-owner">
            Owner
          </label>
          <input
            id="tpl-create-owner"
            type="text"
            className="task-form-input"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="Name or team"
          />
        </div>
      </div>
      <div className="task-form-actions">
        <button type="submit" className="btn btn-primary">
          Create template
        </button>
      </div>
    </form>
  )
}

function InlineEditTemplate({ template, onSave, onCancel }) {
  const [label, setLabel] = useState(template.label ?? '')
  const [title, setTitle] = useState(template.title ?? '')
  const [description, setDescription] = useState(template.description ?? '')
  const [taskType, setTaskType] = useState(template.taskType ?? 'Discovery')
  const [priority, setPriority] = useState(template.priority ?? 'Medium')
  const [dueDate, setDueDate] = useState(
    typeof template.dueDate === 'string' ? template.dueDate : ''
  )
  const [owner, setOwner] = useState(template.owner ?? '')
  const [titleError, setTitleError] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) {
      setTitleError(true)
      return
    }
    setTitleError(false)
    onSave(template.id, {
      label,
      title,
      description,
      taskType,
      priority,
      dueDate,
      owner,
    })
  }

  const showErr = titleError

  return (
    <div className="template-edit-panel">
      <form className="template-form" onSubmit={handleSubmit} noValidate>
        <div className="template-form-grid">
          <div className="template-form-field">
            <label className="task-form-label task-form-label--block" htmlFor={`edit-label-${template.id}`}>
              Label
            </label>
            <input
              id={`edit-label-${template.id}`}
              type="text"
              className="task-form-input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="template-form-field template-form-field--full">
            <label className="task-form-label task-form-label--block" htmlFor={`edit-title-${template.id}`}>
              Task title
            </label>
            <input
              id={`edit-title-${template.id}`}
              type="text"
              className="task-form-input"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (titleError) setTitleError(false)
              }}
              aria-invalid={showErr}
              aria-describedby={showErr ? `edit-title-err-${template.id}` : undefined}
            />
            {showErr ? (
              <p id={`edit-title-err-${template.id}`} className="form-error" role="alert">
                Template task title is required.
              </p>
            ) : null}
          </div>
          <div className="template-form-field template-form-field--full">
            <label className="task-form-label task-form-label--block" htmlFor={`edit-desc-${template.id}`}>
              Description
            </label>
            <textarea
              id={`edit-desc-${template.id}`}
              className="task-form-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="template-form-field">
            <label className="task-form-label task-form-label--block" htmlFor={`edit-type-${template.id}`}>
              Task type
            </label>
            <select
              id={`edit-type-${template.id}`}
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
          <div className="template-form-field">
            <label className="task-form-label task-form-label--block" htmlFor={`edit-pri-${template.id}`}>
              Priority
            </label>
            <select
              id={`edit-pri-${template.id}`}
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
          <div className="template-form-field">
            <label className="task-form-label task-form-label--block" htmlFor={`edit-due-${template.id}`}>
              Due date
            </label>
            <input
              id={`edit-due-${template.id}`}
              type="date"
              className="task-form-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="template-form-field">
            <label className="task-form-label task-form-label--block" htmlFor={`edit-owner-${template.id}`}>
              Owner
            </label>
            <input
              id={`edit-owner-${template.id}`}
              type="text"
              className="task-form-input"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
          </div>
        </div>
        <div className="task-form-actions">
          <button type="submit" className="btn btn-primary">
            Save
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default function TemplatesPage({
  templates,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
}) {
  const [editingId, setEditingId] = useState(null)

  function handleDelete(template) {
    if (
      window.confirm(
        `Delete template “${template.label || template.title}”? This does not remove tasks already created from it.`
      )
    ) {
      onDeleteTemplate(template.id)
      if (editingId === template.id) setEditingId(null)
    }
  }

  return (
    <div className="templates-page">
      <div className="templates-page-intro">
        <h2 className="templates-page-title">Templates</h2>
        <p className="templates-page-desc">
          Create and manage reusable migration task templates.
        </p>
      </div>

      <CreateTemplateForm onCreate={onCreateTemplate} />

      <section className="template-list-section" aria-labelledby="template-list-heading">
        <h3 id="template-list-heading" className="epic-form-heading">
          All templates ({templates.length})
        </h3>
        {templates.length === 0 ? (
          <p className="template-empty">No templates yet. Create one above.</p>
        ) : (
          <ul className="template-list">
            {templates.map((tpl) => (
              <li key={tpl.id} className="template-list-item">
                {editingId === tpl.id ? (
                  <InlineEditTemplate
                    template={tpl}
                    onSave={(id, data) => {
                      onUpdateTemplate(id, data)
                      setEditingId(null)
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <>
                    <div className="template-list-header">
                      <div className="template-list-title-block">
                        <div className="card-badges template-list-badges">
                          <span className="task-type-badge">{tpl.taskType}</span>
                          <span
                            className={`priority-badge priority-badge--${priorityVariant(tpl.priority)}`}
                          >
                            {tpl.priority}
                          </span>
                        </div>
                        <span className="template-list-label">{tpl.label}</span>
                        <p className="template-list-title">{tpl.title}</p>
                        {tpl.description ? (
                          <p className="template-list-desc">{tpl.description}</p>
                        ) : null}
                        <div className="template-list-meta">
                          {tpl.dueDate ? (
                            <span className="card-meta-item">
                              <span className="card-meta-label">Due</span> {tpl.dueDate}
                            </span>
                          ) : null}
                          {tpl.owner ? (
                            <span className="card-meta-item">
                              <span className="card-meta-label">Owner</span> {tpl.owner}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="template-list-actions">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setEditingId(tpl.id)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => handleDelete(tpl)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
