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

The funnel stage/conversion breakdown — `funnel.steps` in `/api/overview` and
`stages` in `/api/funnels/{id}` — is a real query against a Lakebase Postgres
table (`server/queries.py`): `digital360.horizontal_summary_daily`, the same
gold-layer shape as the Delta table `bfl_std_lake.digital360.horizontal_summary_daily`,
but populated directly in Postgres by a separate pipeline (not a Lakebase
Delta sync). Everything else on those endpoints (KPIs, retention,
time-to-convert, drop-off reasons, trend, App-vs-Web comparison, the user
table) still reads from static JSON fixtures in `server/fixtures/`, since
there's no source table for them yet.

### Lakebase setup (one-time, done in the Databricks workspace UI)

The app only needs the database attached as a resource — how
`digital360.horizontal_summary_daily` gets populated (your own pipeline
writing to Postgres directly) is outside the app's concern, as long as the
table name and columns (`business, product, sub_product, journey_name,
stage_order, stage_names, users, ep_platform, entrypoint_stage, date`) match
what `server/queries.py` expects.

**Attach the database as an app resource**: on the app's page in the
Databricks Apps UI → **Configure** → **+ Add resource** → **Database** →
pick the `datbricks_postgres` instance. This grants the app's service
principal `CONNECT`/`CREATE` on the database and injects `PGHOST`,
`PGPORT`, `PGDATABASE`, `PGUSER`, `PGSSLMODE` into the app's environment
automatically — don't set those yourself in `app.yaml`.

`server/db.py` mints short-lived Postgres OAuth tokens via the Databricks
SDK (`WorkspaceClient().database.generate_database_credential`), scoped to
the instance named in the `LAKEBASE_INSTANCE_NAME` env var in `app.yaml`
(currently `datbricks_postgres` — fix that in `app.yaml` if it's a typo for
your actual instance name). Tokens are cached and refreshed automatically
before they expire.

`HORIZONTAL_SUMMARY_TABLE` (`server/queries.py`, default
`digital360.horizontal_summary_daily`) is the schema-qualified Postgres name
of that table — override via env var if you name it differently.

### Known gap

`/api/overview`'s `business`/`product`/`subProduct`/`journey`/`platform`/
`version`/`from`/`to` query params are all required — if the frontend's date
picker sends a blank `to` (which happens mid-selection, before the end date
is clicked), the query will error. Not fixed yet; flagging it since it's a
real edge case now that the query actually runs.

## Local development

Backend (from repo root):

Locally there's no attached app resource to inject `PGHOST`/`PGDATABASE`/
`PGUSER`, and no app service principal — connect as yourself instead:
`databricks auth login` against the workspace that owns the Lakebase
instance, then export `PGHOST`, `PGDATABASE`, and `PGUSER` (your own
Databricks username) to match your Lakebase project's connection details.

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
