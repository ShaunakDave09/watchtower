# Watchtower — Funnel Observability

A Databricks App with a FastAPI backend (`server/`) and a React + TypeScript
+ Vite frontend (`client/`).

## Structure

```
app.yaml              # Databricks Apps manifest: how the app is started
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

1. Build the frontend: `cd client && npm run build && cd ..`
2. Sync this directory to your Databricks workspace and deploy via the
   `databricks apps` CLI (or the Databricks Apps UI), pointing at the repo
   root. Databricks reads `app.yaml` to know how to start the app
   (`python -m server.app`) and injects `DATABRICKS_APP_PORT`, which
   `server/app.py` binds to.
