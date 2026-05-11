# Tasklane

Work in the Tasklane.

A browser-local agile task tracking board built with React and Vite.

**Developer handoff** (routes, data model, `localStorage`, UX decisions, backlog): [`HANDOFF.md`](HANDOFF.md). This README stays user- and operator-focused.

## What this PoC demonstrates

Tasklane demonstrates:

- Agile task tracking with board lanes
- Epics for grouping related work
- Reusable task templates
- Task metadata: type, priority, due date, owner
- Search and filtering
- Drag and drop ordering
- Light and dark themes
- localStorage persistence
- Copilot-style **paste JSON** import for backlog tasks

## Features

- **Task board** — Backlog, In Progress, Blocked, and Done lanes; create, edit, delete, and move tasks.
- **Drag and drop task ordering** — Reorder within a column and move between columns (`@dnd-kit/core`).
- **Epics** — Group work, reorder epics, open epic detail, and link tasks from the board.
- **Reusable task templates** — Manage patterns on `/templates` and quick-create from the board.
- **Task metadata** — Type, priority, due date, owner, and optional epic link on each task.
- **Task comments/notes** — Add and remove comments in the task edit form; board cards show comment count only.
- **Search and filters** — Search title, description, and owner; filter by status, epic, type, and priority with clear filters.
- **Light and dark theme** — Toggle in the sidebar; choice is persisted in the browser.
- **Browser-local persistence** — Tasks, epics, templates, theme, and sidebar width in `localStorage`.
- **Inline validation** — Required task, epic, and template titles surface clear errors instead of failing silently.
- **Copilot JSON task import** — Paste structured `{ "tasks": [ … ] }` from Copilot (*Import tasks* on the board), preview and tick rows, create selected tasks in **Backlog** (browser-only; no Microsoft Graph).

## Setup and run

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

## Build check

```bash
npm run build
npm run preview
```

Use `preview` to verify production output and client-side routing (for example `/epics` after refresh).

## Importing tasks from Copilot output

1. On the **Task Board**, choose **Import tasks** (next to **Add task** and **Use template**). In the modal, expand **Need the Copilot prompt?** to copy a Microsoft 365 Copilot prompt that asks for Tasklane-compatible JSON, or draft JSON yourself with a **`tasks`** array — see shape below.
2. Paste the JSON under **Paste Copilot JSON**, then **Preview tasks**.
3. Untick rows you do not want, then **Create selected tasks**. They appear in **Backlog** at the end of the column and persist via `kanban-tasks`.

Invalid JSON or rows without a **`title`** are skipped with readable warnings.

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
      "source": "Email | Teams | Meeting | Other"
    }
  ]
}
```

*`source`* is shown in the preview only; stored tasks match the usual fields (title, description, priority, task type, due date, owner, epic unset).

## Data storage

All data is saved in **localStorage** on this machine. Keys are fixed; renaming them would orphan existing data.

| Key | Contents |
| --- | --- |
| `kanban-tasks` | Task list (JSON): order, column, task type, priority, due date, owner, epic link, comment notes, timestamps |
| `kanban-epics` | Epics list (JSON) |
| `kanban-task-templates` | Reusable templates (JSON) |
| `kanban-theme` | `light` or `dark` |
| `kanban-sidebar-width` | Sidebar width in pixels (desktop) |

Clear site data for this origin in the browser to reset the app.

On load, malformed `localStorage` JSON or unexpected shapes do not crash the app: tasks and epics fall back to empty lists; invalid rows are skipped. Templates default to the built-in seed list when the key is missing or empty; corrupt template JSON yields an empty list until you add templates again. Task types **Migration** and **Day 2** map to **Execution** and **Follow-up** respectively. Other unknown task types are normalised when data is loaded or saved.

## PoC scope and limitations

- **Browser-local only** — No server; data stays on the device unless you copy or export it yourself.
- **No backend** — No API, sync, or collaboration service.
- **No accounts** — No authentication or per-user storage.
- **No cross-device sync** — Each browser profile has its own `localStorage`.
- **No role-based permissions** — Anyone with access to the browser profile can read or change stored data.
- **localStorage** can be cleared by the browser or the user; there is no built-in recovery or backup.
- **Not production hardened** — Security, compliance, backups, and operational guarantees are out of scope for this PoC.
- **Drag/drop and filtering** are intentionally lightweight (for example, active filters affect which cards are visible when choosing drop targets).
- **No comments, activity history, or sprint model** in this PoC.
- **No audit trail** — No standalone **backup/export/import** tool for all data as a single file yet (board paste import creates tasks only).

## Recommended next steps

Short-term product ideas (see **`HANDOFF.md`** for a longer ordered engineering backlog):

1. Approvals or ownership models beyond a single optional owner field.
2. JSON import/export.
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

## Tech stack

- [React 18](https://react.dev/)
- [Vite 5](https://vitejs.dev/)
- [React Router](https://reactrouter.com/) — `/` (board), `/epics`, `/epics/:epicId`, `/templates`
- [@dnd-kit](https://dndkit.com/) — drag and drop

## Project layout (high level)

- `src/App.jsx` — Routes, task/epic/template state, reposition helpers, undo delete
- `src/components/` — Board, columns, cards, layout, forms
- `src/pages/` — Epics, epic detail, templates
- `src/hooks/` — `useLocalStorage`, `useEpicsStorage`, `useTemplatesStorage`, `useTheme`
- `src/data/taskMetadata.js` — Task types, priorities, built-in template seed definitions
- `public/_redirects` — SPA fallback for Netlify (see Deployment)
- `vercel.json` — SPA fallback for Vercel (see Deployment)

## Deployment

The app is a static SPA: run `npm run build` and deploy the `dist/` folder. Because React Router uses the History API, the host must serve `index.html` for unknown paths (so `/epics` works on refresh).

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

Visit the printed URL and try `/epics` and a direct refresh to confirm routing works.

## License

Private project; add a license if you plan to publish.
