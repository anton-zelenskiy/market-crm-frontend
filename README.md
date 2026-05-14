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

Dev server: **http://localhost:3001** (`vite.config.ts`).

Other scripts:

- `npm run build` — typecheck and production build (`dist/`)
- `npm run preview` — serve the production build locally
- `npm run lint` — ESLint

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
