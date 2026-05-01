# Kanban Task Manager

A browser-based Kanban board built with React and Vite. Tasks are stored locally in your browser (no server required).

## Features

- **Board** — Four columns: Backlog, In Progress, Blocked, Done.
- **Tasks** — Title, description, create, edit, delete (with confirm and short undo).
- **Drag and drop** — Move cards between columns (`@dnd-kit`).
- **Epics** — Create epics, assign tasks to an epic, reorder epics, open an epic detail page with linked tasks and inline status changes.
- **Theme** — Light / dark mode, persisted per browser.
- **Layout** — Resizable sidebar navigation.

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
| `kanban-tasks`   | Task list (JSON)                  |
| `kanban-epics`   | Epics list (JSON)                 |
| `kanban-theme`   | `light` or `dark`                 |
| `kanban-sidebar-width` | Sidebar width in pixels (desktop) |

Clear site data for this origin in your browser settings to reset the app.

## Tech stack

- [React 18](https://react.dev/)
- [Vite 5](https://vitejs.dev/)
- [React Router](https://reactrouter.com/) — `/` (board), `/epics`, `/epics/:epicId`
- [@dnd-kit](https://dndkit.com/) — drag and drop

## Project layout (high level)

- `src/App.jsx` — Routes, task/epic state, undo delete
- `src/components/` — Board, columns, cards, layout, forms
- `src/pages/` — Epics list and epic detail
- `src/hooks/` — `useLocalStorage`, `useEpicsStorage`, `useTheme`
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
