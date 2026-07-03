import { app, BrowserWindow, ipcMain, clipboard, shell, nativeImage } from 'electron'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  ensureStableUserData,
  loadKanbanStore,
  saveKanbanTasks,
  saveKanbanEpics,
} from './kanbanStorage.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = !app.isPackaged
const APP_ICON_PATH = path.join(__dirname, '..', 'build', 'icon.icns')
const APP_ICON_PNG_PATH = path.join(__dirname, '..', 'build', 'icon.png')

function getAppIcon() {
  const candidates = [APP_ICON_PATH, APP_ICON_PNG_PATH]
  for (const iconPath of candidates) {
    if (!fs.existsSync(iconPath)) continue
    const image = nativeImage.createFromPath(iconPath)
    if (!image.isEmpty()) return image
  }
  return null
}

function applyAppIcon() {
  const icon = getAppIcon()
  if (!icon) return null
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(icon)
  }
  return icon
}

ensureStableUserData(app)

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

function createWindow() {
  const icon = getAppIcon()
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    ...(icon ? { icon } : {}),
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
    startClipboardWatcherForWindow()
  })
}

app.whenReady().then(() => {
  applyAppIcon()
  loadAppSettings()

  ipcMain.handle('kanban:load-store', () => {
    const appData = app.getPath('appData')
    return loadKanbanStore(app.getPath('userData'), appData)
  })

  ipcMain.handle('kanban:save-tasks', (_event, tasks) => {
    saveKanbanTasks(app.getPath('userData'), tasks)
    return { ok: true }
  })

  ipcMain.handle('kanban:save-epics', (_event, epics) => {
    saveKanbanEpics(app.getPath('userData'), epics)
    return { ok: true }
  })

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

  ipcMain.handle('clipboard:get-watcher-enabled', () => {
    return appSettings.clipboardWatcherEnabled
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

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopClipboardWatcherTimers()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  stopClipboardWatcherTimers()
})
