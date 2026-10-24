# Market CRM (frontend)

Single-page app for **Market CRM**: public marketing pages, registration, and an authenticated workspace for companies, marketplace connections, catalog/supply flows, and admin tools.

## What it covers

- **Public** — Home, tariff list and detail, login and registration.
- **Workspace** (after login) — Companies, API connections (Ozon / Wildberries), product grids, supplies, supply templates and drafts, Wildberries supply planning, Ozon clusters, bookkeeping per connection.
- **Admin-only** — Data sources and reports (routes exist; some nav entries may be commented out in the shell layout).

UI stack: **React 19**, **TypeScript**, **Vite**, **Ant Design**, **AG Grid**, **React Router**, **Axios** (JWT via `AuthContext`).

## Prerequisites

- **Node.js 20+** and npm (local dev), or **Docker** with Compose.
- Running **Market CRM backend** (see `market-crm` README). The client calls the API under `/markets/api/v1` by default.

## Configuration

Create `.env` in the repo root (optional for local dev; Vite falls back if unset):

```env
VITE_API_BASE_URL=http://localhost:8001/markets/api/v1
```

Point this at your backend base URL including the `/markets/api/v1` prefix. With Docker Compose in `market-crm`, the API is often exposed on **8001**; adjust if your setup differs.

## Local development

```bash
npm install
npm run dev
```

Dev server: **http://localhost:3001** (`server.js` — Express with Vite middleware and HMR).

Other scripts:

- `npm run build` — typecheck, client build (`dist/client/`) and SSR build (`dist/server/`)
- `npm run start` — run the production SSR server from `dist/`
- `npm run lint` — ESLint

## Server-side rendering

Public landing pages (`/`, `/tariffs`, `/tariff/:slug`, auth pages — see `src/ssr/routes.ts`) are rendered on the server for SEO and hydrated in the browser. All other paths are the CRM: the server returns an empty shell (`noindex`) and the app renders client-side; CRM code is a lazily loaded chunk (`src/CrmApp.tsx`).

- Page `<title>`, description, canonical and Open Graph tags come from `usePageMeta()` in each page (`src/ssr/PageMeta.ts`).
- Data needed for the first render (tariffs) is fetched in `src/entry-server.tsx` and passed to the client via `window.__INITIAL_DATA__` (`useInitialData()`).
- `server.js` also serves `/robots.txt` and `/sitemap.xml`.
- Code rendered on the server must not touch `window`/`localStorage` during render — only in effects and event handlers.

Server environment variables:

- `SSR_API_BASE_URL` — API base reachable from the server (Compose default `http://web:8000/markets/api/v1`); falls back to `VITE_API_BASE_URL`.
- `SITE_URL` — public origin for canonical URLs and the sitemap (e.g. `https://marketplace-postavki.space`); derived from the request when empty.
- `PORT` — listen port (default `3001`).

[Husky](https://typicode.github.io/husky/) is wired via the `prepare` script for git hooks.

## Docker Compose

The stack expects an external reverse-proxy network (same pattern as the backend):

```bash
docker network create nginx-bot_reverse_proxy
```

Then:

```bash
docker compose up -d --build
```

Set `VITE_API_BASE_URL` in `.env` (Compose `env_file`) so the in-container Vite dev server picks it up. For **production** builds (`Dockerfile.prod`), pass the same value as a **build argument** at image build time; see [DEPLOYMENT.md](./DEPLOYMENT.md). Host port defaults to **3001** (`FRONTEND_PORT`).

For production-oriented container builds and hosting notes, see [DEPLOYMENT.md](./DEPLOYMENT.md).
