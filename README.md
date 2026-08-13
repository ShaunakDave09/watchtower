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
pick the `digital360` Lakebase instance. This grants the app's service
principal `CONNECT`/`CREATE` on the database and injects `PGHOST`,
`PGPORT`, `PGDATABASE`, `PGUSER`, `PGSSLMODE` into the app's environment
automatically — don't set those yourself in `app.yaml`.

`server/db.py` mints short-lived Postgres OAuth tokens via the Databricks
SDK (`WorkspaceClient().database.generate_database_credential`), scoped to
the instance named in the `LAKEBASE_INSTANCE_NAME` env var in `app.yaml`
(`digital360` — the Lakebase instance name shown under **Database
instances** in the workspace, distinct from `PGDATABASE`, which is the
default Postgres database *inside* that instance). Tokens are cached and
refreshed automatically before they expire.

`HORIZONTAL_SUMMARY_TABLE` (`server/queries.py`, default
`digital360.horizontal_summary_daily`) is the schema-qualified Postgres name
of that table — override via env var if you name it differently.

The filter panel's Month field is backed by a second table,
`MONTHLY_SUMMARY_TABLE` (`server/queries.py`, default
`digital360.business_funnel_monthly`) — same dimension columns as the daily
table, but rows are pre-aggregated per calendar month via a `PARTITIONCOL`
column (`YYYYMM`, e.g. `202608`) instead of a per-day `DATE`. Picking a
specific month queries this table directly instead of summing the daily
table over that month's date range, so it needs to exist and be populated
independently of `HORIZONTAL_SUMMARY_TABLE` for the Month filter to return
real data — leaving Month on "All" (the default) never touches this table.

### Known gap

`/api/overview`'s `business`/`product`/`subProduct`/`journey`/`platform`/
`version`/`month`/`from`/`to` query params are all required — if the
frontend's date picker sends a blank `to` (which happens mid-selection,
before the end date is clicked), the query will error. Not fixed yet;
flagging it since it's a real edge case now that the query actually runs.

## Local development

Backend (from repo root):

Locally there's no attached app resource to inject `PGHOST`/`PGDATABASE`/
`PGUSER`, and no app service principal, so `server/db.py` picks between two
connection modes based on whether `PGPASSWORD` is set (see `_use_oauth()` in
that file):

- **A local Postgres instance (recommended for day-to-day dev)** — set the
  standard libpq env vars, including `PGPASSWORD`, pointing at your local
  database:

  ```bash
  export PGHOST=localhost
  export PGPORT=5432
  export PGDATABASE=watchtower
  export PGUSER=postgres
  export PGPASSWORD=postgres        # presence of this is what selects plain-password mode
  ```

  With `PGPASSWORD` set, `db.py` connects with an ordinary password (via
  libpq, no Databricks SDK call involved) instead of minting an OAuth token,
  and defaults `PGSSLMODE` to `prefer` instead of `require` since a local
  instance usually isn't configured for TLS. Just make sure
  `digital360.business_funnel_daily` (or whatever `HORIZONTAL_SUMMARY_TABLE`
  is set to) exists in that database with the columns listed above.

- **The real Lakebase instance, from your machine** — connect as yourself:
  `databricks auth login` against the workspace that owns the Lakebase
  instance, then export `PGHOST`, `PGDATABASE`, and `PGUSER` (your own
  Databricks username) to match your Lakebase project's connection details,
  and `ENDPOINT_NAME` as in `app.yaml`. Leave `PGPASSWORD` unset — that's what
  tells `db.py` to mint short-lived OAuth tokens via the Databricks SDK
  instead, same as it does when deployed.

Once deployed to Databricks Apps, the attached database resource injects
`PGHOST`/`PGPORT`/`PGDATABASE`/`PGUSER`/`PGSSLMODE` automatically (see
"Lakebase setup" above) with no `PGPASSWORD` in sight, so the app
transparently switches back to OAuth in that environment — no code or config
changes needed between local and deployed.

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
