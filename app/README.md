# Digital360 — Funnel Observability

React + TypeScript + Vite + Tailwind implementation of the Funnel Observability
wireframes (see `../README.md`, `../chats/`, and
`../project/Funnel Observability Wireframes.dc.html` for the original design
handoff).

## Screens

- **Overview** (`/`) — KPI strip, compact conversion funnel, weekly retention
  heatmap, time-to-convert panel, and a filter modal with a two-month date
  range calendar.
- **Funnel detail** (`/funnels/:funnelId`) — full 13-stage breakdown reached
  by clicking the funnel card on Overview: drop-off reasons, conversion
  trend, App vs Web comparison, and a paginated user table.

Data is served through `src/api/client.ts`, a thin async layer over mock
fixtures in `src/api/mockData.ts` — swap its internals for real HTTP calls
without touching the pages/components.

## Development

```bash
npm install
npm run dev
```
