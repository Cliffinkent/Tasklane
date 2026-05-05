export const TASK_TYPES = [
  'Discovery',
  'Assessment',
  'Planning',
  'Migration',
  'Validation',
  'Day 2',
]

export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

export const DEFAULT_TASK_TYPE = 'Discovery'
export const DEFAULT_PRIORITY = 'Medium'

export const TASK_TYPE_SET = new Set(TASK_TYPES)
export const PRIORITY_SET = new Set(PRIORITIES)

export const MIGRATION_TASK_TEMPLATES = [
  {
    id: 'discovery-workshop',
    label: 'Discovery workshop',
    title: 'Run discovery workshop',
    description:
      'Capture application, infrastructure, dependency, and stakeholder context.',
    taskType: 'Discovery',
    priority: 'High',
    dueDate: '',
    owner: '',
  },
  {
    id: 'application-assessment',
    label: 'Application assessment',
    title: 'Assess application migration readiness',
    description:
      'Review hosting model, dependencies, data flows, risk, complexity, and target landing zone fit.',
    taskType: 'Assessment',
    priority: 'High',
    dueDate: '',
    owner: '',
  },
  {
    id: 'migration-plan',
    label: 'Migration plan',
    title: 'Create migration execution plan',
    description:
      'Define migration waves, cutover approach, rollback plan, owners, and acceptance criteria.',
    taskType: 'Planning',
    priority: 'High',
    dueDate: '',
    owner: '',
  },
  {
    id: 'execute-migration',
    label: 'Execute migration',
    title: 'Execute migration runbook',
    description:
      'Run the approved migration steps, capture issues, and update migration status.',
    taskType: 'Migration',
    priority: 'Critical',
    dueDate: '',
    owner: '',
  },
  {
    id: 'validate-workload',
    label: 'Validate workload',
    title: 'Validate migrated workload',
    description:
      'Confirm application health, connectivity, performance, security controls, and business acceptance.',
    taskType: 'Validation',
    priority: 'High',
    dueDate: '',
    owner: '',
  },
  {
    id: 'day-2-handover',
    label: 'Day 2 handover',
    title: 'Complete Day 2 operations handover',
    description:
      'Document monitoring, backup, support model, ownership, and operational readiness.',
    taskType: 'Day 2',
    priority: 'Medium',
    dueDate: '',
    owner: '',
  },
]
