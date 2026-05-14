import { app, BrowserWindow, ipcMain, clipboard, shell } from 'electron'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { parseTaskdropFileContent } from '../src/utils/parseTaskImport.js'

const require = createRequire(import.meta.url)
const chokidar = require('chokidar')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = !app.isPackaged

/** Shell-style `~/Documents/Tasklane/import` (no literal `~`). */
function importDirHomeDocuments() {
  return path.join(os.homedir(), 'Documents', 'Tasklane', 'import')
}

function importDirElectronDocuments() {
  return path.join(app.getPath('documents'), 'Tasklane', 'import')
}

/** Physical import folder roots (deduped). Populated in startWatcher(). */
let importRootsAbs = []

function collectImportRoots() {
  const candidates = [importDirHomeDocuments(), importDirElectronDocuments()]
  const seen = new Set()
  const roots = []
  for (const c of candidates) {
    try {
      fs.mkdirSync(c, { recursive: true })
    } catch (err) {
      console.warn('[Tasklane import] mkdir failed:', c, err?.message || err)
      continue
    }
    let abs
    try {
      abs = fs.realpathSync.native(c)
    } catch {
      abs = path.resolve(c)
    }
    if (!seen.has(abs)) {
      seen.add(abs)
      roots.push(abs)
    }
  }
  return roots
}

function normaliseWatcherPath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return ''
  if (path.isAbsolute(rawPath)) return path.resolve(rawPath)
  const root = importRootsAbs[0]
  if (!root) return path.resolve(rawPath)
  return path.resolve(root, rawPath)
}

function isUnderImportTree(filePath) {
  const fp = path.resolve(filePath)
  for (const root of importRootsAbs) {
    const prefix = root.endsWith(path.sep) ? root : root + path.sep
    if (fp === root || fp.startsWith(prefix)) return true
  }
  return false
}

function isDirectChildJson(filePath) {
  const fp = path.resolve(filePath)
  if (!fp.toLowerCase().endsWith('.json')) return false
  const dir = path.dirname(fp)
  return importRootsAbs.some((root) => dir === root)
}

const SETTINGS_PATH = () =>
  path.join(app.getPath('userData'), 'tasklane-settings.json')

/** @type {{ clipboardWatcherEnabled: boolean }} */
let appSettings = { clipboardWatcherEnabled: true }

function loadAppSettings() {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH(), 'utf8')
    const j = JSON.parse(raw)
    if (typeof j.clipboardWatcherEnabled === 'boolean') {
      appSettings.clipboardWatcherEnabled = j.clipboardWatcherEnabled
    }
  } catch {
    // missing or invalid — keep defaults
  }
}

function saveAppSettings() {
  try {
    fs.mkdirSync(path.dirname(SETTINGS_PATH()), { recursive: true })
    fs.writeFileSync(
      SETTINGS_PATH(),
      JSON.stringify(appSettings, null, 2),
      'utf8'
    )
  } catch (err) {
    console.warn('[Tasklane clipboard] save settings failed:', err?.message || err)
  }
}

function stripBomTrim(s) {
  return String(s ?? '').replace(/^\uFEFF/, '').trim()
}

/** Lightweight gate for Copilot-style task JSON (full parse in renderer). */
function stripMarkdownFenceLite(raw) {
  let t = stripBomTrim(raw)
  const full = t.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/im)
  if (full) return full[1].trim()
  const i = t.indexOf('```')
  if (i !== -1) {
    let rest = t.slice(i + 3).replace(/^\s*(?:json)?\s*\n?/i, '')
    const j = rest.indexOf('```')
    if (j !== -1) t = rest.slice(0, j).trim()
    else t = rest.trim()
  }
  return t
}

function passesTasksJsonGate(raw) {
  const t = stripMarkdownFenceLite(raw)
  if (!t.length) return false
  const c0 = t[0]
  if (c0 !== '{' && c0 !== '[') return false
  const low = t.toLowerCase()
  if (!low.includes('title') && !low.includes('tasks')) return false
  try {
    JSON.parse(t)
    return true
  } catch {
    return false
  }
}

let mainWindow = null
let watcher = null
const backlog = []
let awaitingAckPath = null
let ackTimer = null

let clipboardPollTimer = null
/** Last payload we notified for; also refreshed on ack/dismiss cooldown. */
let lastEmittedClipboardPayload = undefined
let clipboardCooldownUntil = 0
let clipboardFocusHandler = null

function beginClipboardCooldownFromRenderer() {
  clipboardCooldownUntil = Date.now() + 5000
  try {
    lastEmittedClipboardPayload = clipboard.readText()
  } catch {
    lastEmittedClipboardPayload = undefined
  }
}

function stopClipboardWatcherTimers() {
  if (clipboardPollTimer) {
    clearInterval(clipboardPollTimer)
    clipboardPollTimer = null
  }
  if (clipboardFocusHandler && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.removeListener('focus', clipboardFocusHandler)
  }
  clipboardFocusHandler = null
}

function runClipboardPoll() {
  if (!appSettings.clipboardWatcherEnabled) return
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (Date.now() < clipboardCooldownUntil) return
  let cur
  try {
    cur = clipboard.readText()
  } catch (err) {
    console.warn('[Tasklane clipboard] readText failed:', err?.message || err)
    return
  }
  if (cur === lastEmittedClipboardPayload) return
  if (!passesTasksJsonGate(cur)) return
  lastEmittedClipboardPayload = cur
  try {
    mainWindow.webContents.send('clipboard:tasks-detected', cur)
    console.log('[Tasklane clipboard] tasks-detected IPC sent')
  } catch (err) {
    console.warn('[Tasklane clipboard] webContents.send failed:', err?.message || err)
  }
}

function startClipboardWatcherForWindow() {
  stopClipboardWatcherTimers()
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (!appSettings.clipboardWatcherEnabled) return
  clipboardFocusHandler = () => runClipboardPoll()
  mainWindow.on('focus', clipboardFocusHandler)
  clipboardPollTimer = setInterval(runClipboardPoll, 2500)
  queueMicrotask(() => runClipboardPoll())
}

function stopWatcher() {
  if (watcher) {
    watcher.close().catch(() => {})
    watcher = null
  }
}

function clearAckTimer() {
  if (ackTimer) {
    clearTimeout(ackTimer)
    ackTimer = null
  }
}

function scheduleAckTimeout() {
  clearAckTimer()
  ackTimer = setTimeout(() => {
    if (awaitingAckPath) {
      console.warn('[Tasklane import] Ack timeout, releasing:', awaitingAckPath)
      awaitingAckPath = null
      void tryProcessBacklog()
    }
    ackTimer = null
  }, 60_000)
}

async function moveToProcessed(srcPath) {
  const destDir = path.join(path.dirname(path.resolve(srcPath)), 'processed')
  await fsPromises.mkdir(destDir, { recursive: true })
  const base = path.basename(srcPath)
  let dest = path.join(destDir, base)
  try {
    await fsPromises.access(dest)
    const stem = path.parse(base).name
    const ext = path.parse(base).ext || '.json'
    dest = path.join(destDir, `${stem}-${Date.now()}${ext}`)
  } catch {
    // dest free
  }
  await fsPromises.rename(srcPath, dest)
}

function enqueueFile(rawPath, eventType) {
  const filePath = normaliseWatcherPath(rawPath)
  console.log('[Tasklane import] fs event:', {
    event: eventType,
    rawPath,
    normalized: filePath,
  })

  if (!isDirectChildJson(filePath)) {
    console.log(
      '[Tasklane import] skipped (not a direct child .json of an import root):',
      filePath,
      'roots:',
      importRootsAbs
    )
    return
  }
  if (backlog.includes(filePath) || filePath === awaitingAckPath) return
  backlog.push(filePath)
  void tryProcessBacklog()
}

/** Files already in the folder when the app opens (ignoreInitial skips them otherwise). */
function scanExistingJsonInImportRoots() {
  for (const root of importRootsAbs) {
    let entries
    try {
      entries = fs.readdirSync(root, { withFileTypes: true })
    } catch (err) {
      console.warn('[Tasklane import] scan readdir failed:', root, err?.message || err)
      continue
    }
    for (const ent of entries) {
      if (!ent.isFile()) continue
      if (!ent.name.toLowerCase().endsWith('.json')) continue
      enqueueFile(path.join(root, ent.name), 'existing')
    }
  }
}

async function tryProcessBacklog() {
  if (awaitingAckPath || !mainWindow || mainWindow.isDestroyed()) return
  const filePath = backlog.shift()
  if (!filePath) return

  if (!isUnderImportTree(filePath) || !isDirectChildJson(filePath)) {
    void tryProcessBacklog()
    return
  }

  let text
  try {
    text = await fsPromises.readFile(filePath, 'utf8')
  } catch (err) {
    console.warn('[Tasklane import] Could not read file:', filePath, err?.message || err)
    void tryProcessBacklog()
    return
  }

  const { tasks, warnings } = parseTaskdropFileContent(text)
  for (const w of warnings) {
    if (w && !w.includes('No input pasted')) {
      console.warn('[Tasklane import]', filePath, w)
    }
  }

  if (!tasks.length) {
    console.warn(
      '[Tasklane import] Skipping file (malformed JSON, empty, or no valid tasks):',
      filePath
    )
    void tryProcessBacklog()
    return
  }

  const fp = path.resolve(filePath)
  awaitingAckPath = fp
  scheduleAckTimeout()
  const items = tasks
  console.log(
    '[Tasklane import] Parsed',
    items.length,
    'task(s); scheduling IPC to renderer (macrotask so React can subscribe first)'
  )

  setTimeout(() => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      if (awaitingAckPath === fp) {
        clearAckTimer()
        awaitingAckPath = null
      }
      void tryProcessBacklog()
      return
    }
    if (awaitingAckPath !== fp) return
    try {
      mainWindow.webContents.send('taskdrop-pending-import', {
        filePath: fp,
        items,
      })
      console.log('[Tasklane import] IPC sent to renderer:', fp)
    } catch (err) {
      console.warn('[Tasklane import] webContents.send failed:', err?.message || err)
      clearAckTimer()
      awaitingAckPath = null
      void tryProcessBacklog()
    }
  }, 0)
}

function startWatcher() {
  if (watcher) return

  importRootsAbs = collectImportRoots()
  if (!importRootsAbs.length) {
    console.warn('[Tasklane import] No import roots available; watcher not started.')
    return
  }

  const homePath = importDirHomeDocuments()
  const electronPath = importDirElectronDocuments()
  if (path.resolve(homePath) !== path.resolve(electronPath)) {
    console.log(
      '[Tasklane import] Note: ~/Documents and app.getPath("documents") differ; both are watched if they resolve to different folders.'
    )
  }
  console.log('[Tasklane import] Watcher initialising (chokidar, not fs.watch)')
  console.log('[Tasklane import] os.homedir():', os.homedir())
  console.log('[Tasklane import] Import roots (physical, deduped):', importRootsAbs)
  console.log('[Tasklane import] Homedir Documents path:', homePath)
  console.log('[Tasklane import] app.getPath("documents") import:', electronPath)

  const patterns = importRootsAbs.map((r) => path.join(r, '*.json'))
  console.log('[Tasklane import] Watching glob(s):', patterns)

  const usePoll = process.env.TASKLANE_IMPORT_POLL === '1'
  if (usePoll) {
    console.log('[Tasklane import] TASKLANE_IMPORT_POLL=1 — using polling fallback')
  }

  watcher = chokidar.watch(patterns.length === 1 ? patterns[0] : patterns, {
    ignored: [/[/\\]processed[/\\]/],
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 400, pollInterval: 100 },
    ...(usePoll ? { usePolling: true, interval: 1000 } : {}),
  })

  watcher.on('ready', () => {
    console.log('[Tasklane import] chokidar ready — scanning for existing .json files (deferred)')
    setTimeout(() => scanExistingJsonInImportRoots(), 0)
  })

  watcher.on('all', (event, fp) => {
    console.log('[Tasklane import] chokidar raw event:', event, fp)
    if (event === 'add' || event === 'change') {
      enqueueFile(fp, event)
    }
  })

  watcher.on('error', (err) => {
    console.warn('[Tasklane import] Watcher error:', err?.message || err)
  })
}

ipcMain.on('taskdrop-import-handled', async (_event, payload) => {
  const filePath = payload?.filePath
  const success = Boolean(payload?.success)
  if (typeof filePath !== 'string' || !filePath) return
  if (!awaitingAckPath || path.resolve(filePath) !== path.resolve(awaitingAckPath)) {
    return
  }

  clearAckTimer()
  awaitingAckPath = null

  console.log('[Tasklane import] Renderer ack:', { filePath, success })

  if (success && isUnderImportTree(filePath) && isDirectChildJson(filePath)) {
    try {
      await moveToProcessed(filePath)
    } catch (err) {
      console.warn('[Tasklane import] Could not move to processed:', filePath, err?.message || err)
    }
  }

  void tryProcessBacklog()
})

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.on('closed', () => {
    stopClipboardWatcherTimers()
    mainWindow = null
    clearAckTimer()
    awaitingAckPath = null
    backlog.length = 0
    importRootsAbs = []
    stopWatcher()
  })

  const distIndex = path.join(__dirname, '..', 'dist', 'index.html')
  const preferDist =
    fs.existsSync(distIndex) &&
    (!isDev || process.env.TASKLANE_USE_DIST === '1')
  if (preferDist) {
    mainWindow.loadFile(distIndex)
  } else if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(distIndex)
  }

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Tasklane import] Window did-finish-load; starting file watcher')
    startWatcher()
    startClipboardWatcherForWindow()
  })
}

app.whenReady().then(() => {
  loadAppSettings()

  ipcMain.handle('shell:open-external', async (_event, url) => {
    if (typeof url !== 'string' || !url.trim()) {
      return { success: false, error: 'Invalid URL' }
    }
    const u = url.trim()
    try {
      await shell.openExternal(u)
      return { success: true }
    } catch (err) {
      if (process.platform === 'darwin') {
        try {
          execFileSync('open', [u], { stdio: 'ignore' })
          return { success: true }
        } catch (fallbackErr) {
          return {
            success: false,
            error: String(fallbackErr?.message || fallbackErr),
          }
        }
      }
      return { success: false, error: String(err?.message || err) }
    }
  })

  ipcMain.on('clipboard:tasks-acknowledged', () => {
    beginClipboardCooldownFromRenderer()
  })
  ipcMain.on('clipboard:tasks-dismissed', () => {
    beginClipboardCooldownFromRenderer()
  })
  ipcMain.on('clipboard:set-watcher-enabled', (_event, enabled) => {
    appSettings.clipboardWatcherEnabled = Boolean(enabled)
    saveAppSettings()
    if (!mainWindow || mainWindow.isDestroyed()) return
    stopClipboardWatcherTimers()
    if (appSettings.clipboardWatcherEnabled) {
      startClipboardWatcherForWindow()
    }
  })
  console.log('[Tasklane import] Electron app.whenReady — app is ready')
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopWatcher()
  stopClipboardWatcherTimers()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  stopWatcher()
  stopClipboardWatcherTimers()
  clearAckTimer()
})
