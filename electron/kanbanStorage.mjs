import fs from 'node:fs'
import path from 'node:path'

export const STABLE_USER_DATA_DIR = 'com.tasklane.app'
export const LEGACY_USER_DATA_DIRS = ['task-manager', 'Taskdrop', 'Tasklane']

export const KANBAN_TASKS_KEY = 'kanban-tasks'
export const KANBAN_EPICS_KEY = 'kanban-epics'

export function dataDir(userData) {
  return path.join(userData, 'data')
}

export function tasksFilePath(userData) {
  return path.join(dataDir(userData), `${KANBAN_TASKS_KEY}.json`)
}

export function epicsFilePath(userData) {
  return path.join(dataDir(userData), `${KANBAN_EPICS_KEY}.json`)
}

function userDataHasLocalStorage(dir) {
  try {
    const ls = path.join(dir, 'Local Storage')
    return fs.existsSync(ls) && fs.readdirSync(ls).length > 0
  } catch {
    return false
  }
}

export function ensureStableUserData(app) {
  const appData = app.getPath('appData')
  const stable = path.join(appData, STABLE_USER_DATA_DIR)
  app.setPath('userData', stable)

  if (userDataHasLocalStorage(stable)) return stable

  for (const legacyName of LEGACY_USER_DATA_DIRS) {
    const legacy = path.join(appData, legacyName)
    if (path.resolve(legacy) === path.resolve(stable)) continue
    if (!userDataHasLocalStorage(legacy)) continue
    try {
      fs.cpSync(legacy, stable, { recursive: true, force: true })
      console.log(`[Tasklane] restored userData from ${legacyName}`)
    } catch (err) {
      console.warn(
        `[Tasklane] could not copy userData from ${legacyName}:`,
        err?.message || err
      )
    }
    break
  }

  return stable
}

function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null
    const raw = fs.readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw)
    return parsed
  } catch {
    return null
  }
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8')
}

/** Best-effort extract of a JSON array stored under a localStorage key in Chromium leveldb. */
function extractJsonArrayFromLevelDb(userDataDir, storageKey) {
  const ldbDir = path.join(userDataDir, 'Local Storage', 'leveldb')
  if (!fs.existsSync(ldbDir)) return null

  let hay = ''
  try {
    for (const name of fs.readdirSync(ldbDir)) {
      if (!/\.(log|ldb|sst)$/i.test(name)) continue
      const fp = path.join(ldbDir, name)
      const stat = fs.statSync(fp)
      if (!stat.isFile() || stat.size < 8) continue
      const chunk = fs.readFileSync(fp)
      hay += chunk.toString('utf8')
      hay += chunk.toString('latin1')
    }
  } catch {
    return null
  }

  const keyIdx = hay.indexOf(storageKey)
  if (keyIdx === -1) return null

  const slice = hay.slice(keyIdx, keyIdx + 2_000_000)
  const arrStart = slice.indexOf('[')
  if (arrStart === -1) return null

  let depth = 0
  let inString = false
  let escape = false
  for (let i = arrStart; i < slice.length; i++) {
    const ch = slice[i]
    if (inString) {
      if (escape) escape = false
      else if (ch === '\\') escape = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '[') depth++
    else if (ch === ']') {
      depth--
      if (depth === 0) {
        try {
          const parsed = JSON.parse(slice.slice(arrStart, i + 1))
          return Array.isArray(parsed) ? parsed : null
        } catch {
          return null
        }
      }
    }
  }
  return null
}

function importLegacyLevelDbIntoFiles(userData, appData) {
  const tasksPath = tasksFilePath(userData)
  const epicsPath = epicsFilePath(userData)

  let tasks = readJsonFile(tasksPath)
  let epics = readJsonFile(epicsPath)
  const hasTasks = Array.isArray(tasks) && tasks.length > 0
  const hasEpics = Array.isArray(epics) && epics.length > 0
  if (hasTasks && hasEpics) return

  const dirs = [
    userData,
    ...LEGACY_USER_DATA_DIRS.map((name) =>
      path.join(appData, name)
    ),
  ]

  for (const dir of dirs) {
    if (!hasTasks && !tasks?.length) {
      const extracted = extractJsonArrayFromLevelDb(dir, KANBAN_TASKS_KEY)
      if (Array.isArray(extracted) && extracted.length) tasks = extracted
    }
    if (!hasEpics && !epics?.length) {
      const extracted = extractJsonArrayFromLevelDb(dir, KANBAN_EPICS_KEY)
      if (Array.isArray(extracted) && extracted.length) epics = extracted
    }
    if (tasks?.length && epics?.length) break
  }

  if (Array.isArray(tasks) && tasks.length && !hasTasks) {
    writeJsonFile(tasksPath, tasks)
    console.log(`[Tasklane] imported ${tasks.length} tasks into profile data file`)
  }
  if (Array.isArray(epics) && epics.length && !hasEpics) {
    writeJsonFile(epicsPath, epics)
    console.log(`[Tasklane] imported ${epics.length} epics into profile data file`)
  }
}

export function loadKanbanStore(userData, appData) {
  importLegacyLevelDbIntoFiles(userData, appData)

  const tasks = readJsonFile(tasksFilePath(userData))
  const epics = readJsonFile(epicsFilePath(userData))

  return {
    tasks: Array.isArray(tasks) ? tasks : [],
    epics: Array.isArray(epics) ? epics : [],
  }
}

export function saveKanbanTasks(userData, tasks) {
  if (!Array.isArray(tasks)) return
  writeJsonFile(tasksFilePath(userData), tasks)
}

export function saveKanbanEpics(userData, epics) {
  if (!Array.isArray(epics)) return
  writeJsonFile(epicsFilePath(userData), epics)
}
