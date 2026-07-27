# Digital360 — Funnel Observability

React + TypeScript + Vite + Tailwind frontend for the Funnel Observability
app. See the repo root `README.md` for how this fits into the Databricks App
as a whole.

## Screens

- **Overview** (`/`) — KPI strip, compact conversion funnel, weekly retention
  heatmap, time-to-convert panel, and a filter modal with a two-month date
  range calendar.
- **Funnel detail** (`/funnels/:funnelId`) — full 13-stage breakdown reached
  by clicking the funnel card on Overview: drop-off reasons, conversion
  trend, App vs Web comparison, and a paginated user table.

Data is served through `src/api/client.ts`, a thin `fetch` layer over the
`/api/*` endpoints exposed by the FastAPI backend in `../server`.

## Development

Run the backend first (see root `README.md`), then in this directory:

```bash
npm install
npm run dev
```

The dev server proxies `/api/*` requests to `http://localhost:8000`, where
the FastAPI backend should be running.

## Production build

```bash
npm run build
```

Outputs static assets to `dist/`, which the FastAPI backend serves directly.
