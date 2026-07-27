# Watchtower — Funnel Observability

A Databricks App with a FastAPI backend (`server/`) and a React + TypeScript
+ Vite frontend (`client/`).

## Structure

```
app.yaml              # Databricks Apps manifest: how the app is started
package.json          # root-level, only so Databricks builds client/ (see below)
requirements.txt       # Python deps for the backend
server/                # FastAPI backend
  app.py               # entrypoint: serves client/dist + /api/* routes
  routers/              # API route handlers
  fixtures/             # JSON fixtures backing /api/* for now (see below)
client/                 # React/Vite frontend (see client/README.md)
```

Databricks Apps runs your app as a single long-lived process rather than
serving static files directly, so `server/app.py` both serves the built
frontend (`client/dist`) and exposes the `/api/*` endpoints the frontend
calls.

### Why there's a `package.json` at the repo root

Databricks Apps only auto-runs `npm install` / `npm run build` during deploy
if it finds a `package.json` at the **root** of the app directory — it does
not look inside subdirectories. Since the actual frontend lives in `client/`,
the root `package.json` exists solely to satisfy that detection; its `build`
script just delegates into `client/`:

```json
"scripts": { "build": "npm install --prefix client && npm run build --prefix client" }
```

Databricks runs this automatically before starting the process defined in
`app.yaml`, so `client/dist` exists by the time `server/app.py` starts and
tries to serve it. `client/dist` is gitignored — it's built at deploy time,
not committed.

## Data

`/api/filters`, `/api/overview`, and `/api/funnels/{id}` currently read from
static JSON fixtures in `server/fixtures/`, mirroring what was previously
mocked client-side. Swapping these for real Databricks SQL warehouse /
Unity Catalog queries (via the Databricks SDK) is a follow-up — the router
functions in `server/routers/` are the place to make that change without
touching the frontend.

## Local development

Backend (from repo root):

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m server.app          # serves on http://localhost:8000
```

Frontend (in a second terminal):

```bash
cd client
npm install
npm run dev                   # http://localhost:5173, proxies /api to :8000
```

## Production build

```bash
cd client && npm install && npm run build && cd ..
python -m server.app
```

`server/app.py` serves the compiled frontend from `client/dist` alongside
the API, so a single process handles everything Databricks Apps needs to run.

## Deploying to Databricks Apps

Sync this directory to your Databricks workspace and deploy via the
`databricks apps` CLI (or the Databricks Apps UI), pointing at the repo
root. Databricks will:

1. Detect `requirements.txt` and `package.json` at the root and install both.
2. Run `npm run build` (root `package.json`), which builds `client/` into
   `client/dist`.
3. Run the command from `app.yaml` (`python -m server.app`), which serves
   `client/dist` and the `/api/*` routes, bound to the injected
   `DATABRICKS_APP_PORT`.

No manual build step is required — it happens as part of the Databricks
deploy. (You can still build locally with `npm run build` from the repo
root, e.g. to test the production path before deploying — see above.)
