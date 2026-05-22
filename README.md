# Tasklane

Work in the Tasklane.

A browser-local agile task tracking board built with React and Vite. The same UI can run in the **browser** or inside an **Electron** desktop shell for clipboard-assisted Copilot JSON import.

**Developer handoff** (routes, data model, `localStorage`, architecture notes): [`SOURCE_REVIEW.md`](SOURCE_REVIEW.md). This README stays user- and operator-focused.

## What this PoC demonstrates

Tasklane demonstrates:

- Agile task tracking with board lanes
- Epics for grouping related work
- Reusable task templates
- Task metadata: type, priority, due date, owner
- Search and filtering
- Drag and drop ordering
- Light and dark themes
- `localStorage` persistence
- **Task archive** — hide tasks from the board while keeping them in storage; restore to the same lane
- **Drop Zone** — dedicated `/dropzone` flow to paste Copilot JSON, preview and edit tasks, add to backlog, export to **Things 3**, and review **import/export history**
- **Board import modal** — lightweight paste + preview + create; optional clipboard prefill and a link to the full Drop Zone
- Optional **Electron** build with a clipboard watcher that nudges you when task-shaped JSON appears on the clipboard

## Features

- **Task board** — Backlog, In Progress, Blocked, and Done lanes; create, edit, delete, move, and archive tasks.
- **Task archive** — Archive from the board card toolbar; review and restore on `/archive` (sidebar **Archive**).
- **Drag and drop task ordering** — Reorder within a column and move between columns (`@dnd-kit/core`).
- **Epics** — Group work, reorder epics, open epic detail, and link tasks from the board.
- **Reusable task templates** — Manage patterns on `/templates` and quick-create from the board.
- **Task metadata** — Type, priority, due date, owner, and optional epic link on each task.
- **Compact board cards** — Long descriptions are hidden by default; use **Show more** / **Show less** per card. Priority and epic badges sit at the bottom of the card; task type stays in the top toolbar.
- **Task comments/notes** — Add and remove comments in the task edit form; board cards show comment count only.
- **Search and filters** — Search title, description, and owner; filter by status, epic, type, and priority with clear filters.
- **Light and dark theme** — Toggle in the sidebar; choice is persisted in the browser.
- **Browser-local persistence** — Tasks, epics, templates, theme, and sidebar width in `localStorage`.
- **Inline validation** — Required task, epic, and template titles surface clear errors instead of failing silently.
- **Copilot import** — Drop Zone and the board import modal share a Copilot prompt that returns a daily briefing plus a trailing `json` code block. The parser accepts raw JSON or markdown with a final fenced `json` block. No Microsoft Graph; JSON only.

## Task Archive

Tasklane keeps one task list in the browser. Each task has an `archived` flag separate from its board lane (`columnId`).

- **Active tasks** appear on the board, in epic counts, epic detail, and Drop Zone duplicate checks.
- **Archive** — On the board, use **Archive** on a task card. The task leaves the board immediately but stays in `localStorage`. A short status toast confirms the action. There is no confirmation dialog; use **Restore** on the Archive page if you change your mind.
- **Archive page** — Open **Archive** in the sidebar (`/archive`). Archived tasks are listed with lane and epic context. **Restore** sets the task active again in the same lane and position because `columnId` and `order` are preserved. **Delete** uses the same confirm-and-undo flow as on the board.

## Setup and run (web)

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

## Desktop (Electron)

The repo includes an Electron main process (`electron/main.mjs`) and preload (`electron/preload.mjs`) that load the Vite app. The main process can poll the system clipboard (when enabled) and surface a toast in the app when Copilot-style task JSON is detected.

| Command | Description |
| --- | --- |
| `npm run desktop:dev` | Runs Vite on port 5173 and opens Electron against the dev server (uses `concurrently` + `wait-on`). |
| `npm run desktop:dist` | Production Vite build, then Electron loads `dist/index.html`. |
| `npm run desktop` | Electron only; expects a build or dev server per your workflow. |
| `npm run pack` | Unpacked macOS app in `release/` (run `npm run build` first; `pack` does not rebuild `dist/`) |
| `npm run dist` | Production build, repair Electron vendor symlinks, then DMG installer in `release/` |
| `npm run release:patch` | Bump patch version in `package.json`, then run `dist` |

Electron loads `dist/index.html` in packaged mode (`HashRouter`, so `/archive` works as `#/archive`). See **Task Archive** and [`SOURCE_REVIEW.md`](SOURCE_REVIEW.md) for handoff detail.

**Desktop profile (tasks and epics)** — The packaged app stores board data under a stable folder so reinstalling the DMG does not start from scratch:

- Profile root: `~/Library/Application Support/com.tasklane.app` (macOS)
- Task and epic snapshots: `data/kanban-tasks.json`, `data/kanban-epics.json`
- On first launch, Tasklane copies legacy profiles (`task-manager`, `Taskdrop`, `Tasklane`) and attempts to import from older browser storage if needed.

To restore manually after a bad install:

```bash
bash scripts/restore-tasklane-profile.sh
```

If `npm run dist` fails with `ELOOP` on `.electron-vendor`, run `node scripts/repair-electron-vendor.mjs` and try again.

**Drop Zone settings** (sidebar, bottom): Things 3 **project / list ID** is stored in `localStorage` (`tasklane-dropzone-things3-listid`). In Electron, **Clipboard watcher** on/off is stored under the app user data folder in `tasklane-settings.json` and applied on launch.

## Build check

```bash
npm run build
npm run preview
```

Use `preview` to verify production output and client-side routing (for example `/epics`, `/archive`, or `/dropzone` after refresh).

## Importing tasks from Copilot output

### Board (quick path)

1. On the **Task Board**, choose **Import tasks** (next to **Add task** and **Use template**). In the modal, expand **Need the Copilot prompt?** to copy the Tasklane Copilot prompt (briefing plus trailing JSON), or paste JSON yourself with a **`tasks`** array (or a top-level JSON array of task objects — see Drop Zone below). Paste the full Copilot reply or just the final `json` block.
2. If the clipboard already contains valid task JSON when the modal opens, the textarea may prefill and a short notice appears.
3. Paste or adjust the JSON, then **Preview tasks**. Untick rows you do not want, then **Create selected tasks**. They appear in **Backlog** at the end of the column.
4. **Need more options?** → **Open Drop Zone** closes the modal and navigates to `/dropzone` (clipboard JSON can be passed through so Drop Zone opens with the same text).

### Drop Zone (full path)

1. Open **Drop Zone** from the sidebar (`/dropzone`).
2. Use the **Import** tab: prompt shelf (editable per destination; **Reset to Default** picks up prompt updates), paste area, **Parse** / auto-parse, then an editable preview. Paste a full Copilot reply or raw JSON — Tasklane imports the `json` block at the bottom. Send checked tasks to the board (**Add to Board**) or **Export to Things 3** (builds a `things:///json?...` URL; Electron opens it via the shell helper).
3. Use the **History** tab to see recent board imports and Things exports stored in `localStorage`, with optional **Clear history**.

Invalid JSON or rows without a usable **title** are skipped with readable errors or warnings.

**Suggested JSON shape:**

```json
{
  "tasks": [
    {
      "title": "Short action title",
      "description": "Useful context from the email or Teams message",
      "priority": "Low | Medium | High | Critical",
      "taskType": "Discovery | Assessment | Planning | Execution | Validation | Follow-up",
      "owner": "Person or team if known, otherwise \"\"",
      "dueDate": "YYYY-MM-DD if explicitly stated, otherwise \"\"",
      "source": "Email | Teams | Meeting | Other | Proactive"
    }
  ]
}
```

*`source`* is shown in previews where relevant; stored board tasks use the usual fields (title, description, priority, task type, due date, owner, epic unset).

## Data persistence

There is no server-side persistence, sync, or backup unless you export data yourself.

### Browser (`npm run dev`)

Data is saved in **localStorage** for the site origin (for example `http://localhost:5173`). Keys are fixed; renaming them would orphan existing data.

| Key | Contents |
| --- | --- |
| `kanban-tasks` | Task list (JSON): `archived`, order, column (`columnId`), task type, priority, due date, owner, epic link, comment notes, timestamps |
| `kanban-epics` | Epics list (JSON) |
| `kanban-task-templates` | Reusable templates (JSON) |
| `kanban-theme` | `light` or `dark` |
| `kanban-sidebar-width` | Sidebar width in pixels (desktop) |
| `tasklane-dropzone-history` | Drop Zone import/export log ( capped list; JSON array ) |
| `tasklane-dropzone-things3-listid` | Optional Things 3 list / project id for exports |
| `tasklane-dropzone-things3-tags` | Optional tag map JSON for Things exports |
| `tasklane-dropzone-prompt-tasklane` / `tasklane-dropzone-prompt-things3` | Editable Copilot prompt text for the Drop Zone shelf |
| `tasklane-dropzone-prompt-tasklane-version` | Prompt version stamp (bump resets a customised Tasklane prompt to the new default) |

Clear site data for this origin in the browser to reset the web app.

### Desktop (packaged Tasklane)

Tasks and epics are mirrored to JSON files under `~/Library/Application Support/com.tasklane.app/data/` so DMG reinstalls keep your board. Templates, theme, sidebar width, and Drop Zone settings still use `localStorage` inside the app session, plus `tasklane-settings.json` for the clipboard watcher.

On load, malformed `localStorage` JSON or unexpected shapes do not crash the app: tasks and epics fall back to empty lists; invalid rows are skipped. Tasks without an `archived` field are treated as active. Templates default to the built-in seed list when the key is missing or empty; corrupt template JSON yields an empty list until you add templates again. Task types **Migration** and **Day 2** map to **Execution** and **Follow-up** respectively. Other unknown task types are normalised when data is loaded or saved.

## Validation checklist (Task Archive)

1. Create a task on the board.
2. Click **Archive** on the card.
3. Confirm the task disappears from the board and a “Task archived” toast appears.
4. Open **Archive** in the sidebar and confirm the task is listed.
5. Click **Restore** and confirm the task reappears in its previous lane.
6. Refresh the browser and confirm the task is still active on the board.
7. Archive the task again, open **Archive**, click **Delete**, confirm the undo toast, and use **Undo** if desired.

## PoC scope and limitations

- **Browser-local only (web)** — No server; data stays on the device unless you copy or export it yourself.
- **No backend** — No API, sync, or collaboration service.
- **No accounts** — No authentication or per-user storage.
- **No cross-device sync** — Each browser profile has its own `localStorage`.
- **No role-based permissions** — Anyone with access to the browser profile can read or change stored data.
- **localStorage** can be cleared by the browser or the user; there is no built-in recovery or backup for the full dataset.
- **Not production hardened** — Security, compliance, backups, and operational guarantees are out of scope for this PoC.
- **Drag/drop and filtering** are intentionally lightweight (for example, active filters affect which cards are visible when choosing drop targets).
- **No activity feed or sprint model** in this PoC.
- **Archive** — No bulk archive, archive search, or server-side archive API; archived tasks remain in the same `kanban-tasks` array as active tasks.
- **No audit trail** for task edits — Drop Zone **history** only logs import/export events from that page, not general board changes.
- **No single-file backup/export** for all app data yet (imports create tasks; Things export is outbound only).

## Recommended next steps

Short-term product ideas (see **`SOURCE_REVIEW.md`** for implementation notes):

1. Approvals or ownership models beyond a single optional owner field.
2. Full JSON or CSV backup/export for tasks, epics, and templates.
3. Keyboard-accessible reorder shortcuts beyond the Move menu.
4. Multi-select or bulk actions.
5. A backend only if sync or collaboration becomes a requirement.

## Requirements

- [Node.js](https://nodejs.org/) (includes `npm`)

### Other scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run desktop:dev` | Vite + Electron for local desktop development |
| `npm run desktop:dist` | Build SPA then run Electron against `dist/` |
| `node scripts/repair-electron-vendor.mjs` | Fix broken `node_modules/.electron-vendor` symlink before `dist` |
| `bash scripts/restore-tasklane-profile.sh` | Copy legacy macOS profile data into `com.tasklane.app` |

## Tech stack

- [React 18](https://react.dev/)
- [Vite 5](https://vitejs.dev/)
- [React Router](https://reactrouter.com/) — `/` (board), `/epics`, `/epics/:epicId`, `/templates`, `/archive`, `/dropzone`
- [Electron](https://www.electronjs.org/) — optional desktop shell (dev and packaged workflows in `package.json`)
- [@dnd-kit](https://dndkit.com/) — drag and drop

## Project layout (high level)

- `src/App.jsx` — Routes, task/epic/template state, active/archived partition, archive/restore handlers, reposition helpers, undo delete, status toasts
- `src/components/` — Board, columns, cards, layout, forms, **ClipboardToast**, **DropZone**\* pieces
- `src/pages/` — Epics, epic detail, templates, **Archive**, **DropZone**
- `src/hooks/` — `useLocalStorage`, `useEpicsStorage`, `useTemplatesStorage`, `useTheme`
- `src/data/taskMetadata.js` — Task types, priorities, built-in template seed definitions
- `src/utils/parseDropZoneJSON.js` — Shared Copilot / Things JSON parsing for Drop Zone and board import
- `electron/main.mjs`, `electron/preload.mjs`, `electron/kanbanStorage.mjs` — Desktop shell, stable profile, task/epic file storage, clipboard helper
- `scripts/repair-electron-vendor.mjs`, `scripts/prepare-electron-dist.mjs`, `scripts/restore-tasklane-profile.sh` — Electron install repair, dist prep, profile restore
- `public/_redirects` — SPA fallback for Netlify (see Deployment)
- `vercel.json` — SPA fallback for Vercel (see Deployment)

## Deployment

The app is a static SPA: run `npm run build` and deploy the `dist/` folder. Because React Router uses the History API, the host must serve `index.html` for unknown paths (so `/epics` and `/dropzone` work on refresh).

### Netlify

1. Connect the repo or drag-and-drop the `dist` folder after a local build.
2. Build settings (if building on Netlify):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. This repo includes [`public/_redirects`](public/_redirects), which Vite copies into `dist` so client routes resolve correctly.

### Vercel

1. Import the project; Vercel detects Vite.
2. Defaults: **Build Command** `npm run build`, **Output Directory** `dist`.
3. [`vercel.json`](vercel.json) rewrites all paths to `index.html` for SPA routing.

### GitHub Pages (project site: `https://<user>.github.io/<repo>/`)

1. Set the Vite base path to your repo name so assets load correctly. In [`vite.config.js`](vite.config.js):

   ```js
   export default defineConfig({
     plugins: [react()],
     base: '/YOUR_REPO_NAME/',
   })
   ```

2. Build and publish `dist/` to the `gh-pages` branch (or use [GitHub Actions](https://vitejs.dev/guide/static-deploy.html#github-pages) from the Vite docs).
3. In the repo **Settings → Pages**, choose the branch/folder that serves the built site.

Use a **project** site URL as above. A **user** site (`username.github.io` with no path) can use `base: '/'`.

### Local production check

```bash
npm run build
npm run preview
```

Visit the printed URL and try `/epics`, `/archive`, `/dropzone`, and a direct refresh to confirm routing works.

## License

Private project; add a license if you plan to publish.
