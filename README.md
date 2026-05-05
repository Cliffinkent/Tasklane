# Kanban Task Manager

A browser-based Kanban board built with React and Vite. Tasks are stored locally in your browser (no server required).

## Features

- **Board** — Four columns: Backlog, In Progress, Blocked, Done.
- **Tasks** — Title, description, migration metadata (task type, priority, due date, owner), create/edit/delete (with confirm and short undo).
- **Ordered cards** — Per-column `order`; drag to reorder within a column or insert before another card; drop on a column appends to the end.
- **Board filters** — Search (title, description, and owner), column/status, epic, **task type**, and **priority**, with count summary and clear action.
- **Templates** — Manage reusable migration task templates (create, edit, delete) on `/templates`; list is stored in `localStorage`. Built-in templates seed the first run.
- **Board quick-create** — “Use template...” dropdown uses your saved templates to open the task form prefilled.
- **Drag and drop** — Reorder and move cards with `@dnd-kit/core` (column and card drop targets).
- **Epics** — Create epics, assign tasks to an epic, reorder epics, open an epic detail page with linked tasks and inline status changes.
- **Theme** — Light / dark mode, persisted per browser.
- **Layout** — Resizable sidebar navigation.
- **UI** — Layout, typography, and contrast tuned for handoff readability (still no backend sync, accounts, or production-grade workflow controls).

## Migration workflow PoC

This app is intentionally framed as a **cloud migration workflow** demo, not only a generic board:

- **Lifecycle categories** via task types (Discovery → Assessment → Planning → Migration → Validation → Day 2).
- **Prioritisation** with Low / Medium / High / Critical on each task.
- **Lightweight ownership** and optional **due dates** alongside epics and board columns.
- **Template-driven creation** from user-managed templates (six built-ins seed the first run); edit templates anytime on the Templates page.
- All of the above persists **only in the browser** (`localStorage`), with the same PoC limits as below (no sync, accounts, or production guarantees).

## PoC scope

- Data is browser-local only (`localStorage`); clearing site data removes it.
- No user accounts or authentication.
- No backend or server-side API.
- No cross-device sync.
- Not production-hardened (security, backups, and operational guarantees are out of scope for this PoC).
- The interface is polished for demos and R&D handoff; it does not replace shared sync, auth, or enterprise workflow tooling.
- Filtering and card order are browser-local and stored in `localStorage` with tasks. Drag-and-drop while filters are active uses **visible** cards only to decide insert position (hidden tasks are not inferred)—intentional for this PoC.

## Recommended next product steps

1. Add approvals, RACI, or formal runbook links per task type.
2. Add JSON import/export.
3. Add keyboard-accessible reorder shortcuts beyond the Move menu.
4. Add multi-select or bulk actions.
5. Consider a backend only if sync or collaboration becomes a requirement.

## Requirements

- [Node.js](https://nodejs.org/) (includes `npm`)

## Setup and run

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

### Other scripts

| Command        | Description                    |
| -------------- | ------------------------------ |
| `npm run dev`  | Start dev server with hot reload |
| `npm run build` | Production build to `dist/`   |
| `npm run preview` | Preview the production build locally |

## Data storage

All data is saved in **localStorage** on your machine:

| Key              | Contents                          |
| ---------------- | --------------------------------- |
| `kanban-tasks`   | Task list (JSON): `order`, `taskType`, `priority`, `dueDate`, `owner`, epic link, timestamps |
| `kanban-task-templates` | Reusable migration templates (JSON) |
| `kanban-epics`   | Epics list (JSON)                 |
| `kanban-theme`   | `light` or `dark`                 |
| `kanban-sidebar-width` | Sidebar width in pixels (desktop) |

Clear site data for this origin in your browser settings to reset the app.

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
