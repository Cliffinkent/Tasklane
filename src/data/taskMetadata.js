export const TASK_TYPES = [
  'Discovery',
  'Assessment',
  'Planning',
  'Execution',
  'Validation',
  'Follow-up',
]

export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

export const DEFAULT_TASK_TYPE = 'Discovery'
export const DEFAULT_PRIORITY = 'Medium'

export const TASK_TYPE_SET = new Set(TASK_TYPES)
export const PRIORITY_SET = new Set(PRIORITIES)

export function normaliseTaskType(value, fallback = 'Discovery') {
  if (value === 'Migration') return 'Execution'
  if (value === 'Day 2') return 'Follow-up'
  return TASK_TYPES.includes(value) ? value : fallback
}

export const TASK_TEMPLATES = [
  {
    id: 'backlog-refinement',
    label: 'Backlog refinement',
    title: 'Refine backlog item',
    description:
      'Clarify scope, acceptance criteria, dependencies, and next steps.',
    taskType: 'Planning',
    priority: 'Medium',
    dueDate: '',
    owner: '',
  },
  {
    id: 'feature-planning',
    label: 'Feature planning',
    title: 'Plan feature delivery',
    description:
      'Define the feature outcome, delivery approach, owners, dependencies, and success criteria.',
    taskType: 'Planning',
    priority: 'High',
    dueDate: '',
    owner: '',
  },
  {
    id: 'implementation-task',
    label: 'Implementation task',
    title: 'Implement task',
    description:
      'Build the agreed change, update relevant documentation, and prepare for review.',
    taskType: 'Execution',
    priority: 'Medium',
    dueDate: '',
    owner: '',
  },
  {
    id: 'review-validation',
    label: 'Review and validation',
    title: 'Review and validate work',
    description:
      'Check the change against acceptance criteria, capture issues, and confirm readiness.',
    taskType: 'Validation',
    priority: 'High',
    dueDate: '',
    owner: '',
  },
  {
    id: 'blocker-investigation',
    label: 'Blocker investigation',
    title: 'Investigate blocker',
    description:
      'Identify the cause of the blocker, document options, and agree the next action.',
    taskType: 'Assessment',
    priority: 'High',
    dueDate: '',
    owner: '',
  },
  {
    id: 'handover-task',
    label: 'Handover task',
    title: 'Prepare handover',
    description:
      'Document ownership, support notes, operational considerations, and follow-up actions.',
    taskType: 'Follow-up',
    priority: 'Medium',
    dueDate: '',
    owner: '',
  },
]
