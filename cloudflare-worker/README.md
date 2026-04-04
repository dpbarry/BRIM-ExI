# ExI Worker API

Cloudflare Worker backend for ExI, intended to be called by the GitHub Pages frontend.

## Quick Start (Windows PowerShell)

```bash
cd cloudflare-worker
npm install
npx wrangler d1 create exi
```

Copy the returned `database_id` into `wrangler.toml` (`[[d1_databases]].database_id`).

## 1) Apply schema to remote D1

```bash
npx wrangler d1 migrations apply exi --remote
```

## 2) Export your existing local data to seed SQL

From repo root:

```bash
npm run worker:seed-export
```

This writes: `cloudflare-worker/seed/seed-data.sql`

## 3) Import seed SQL into D1

```bash
npx wrangler d1 execute exi --remote --file=seed/seed-data.sql
```

## 4) Set Worker secrets

```bash
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put FINANCE_EMAIL
```

Optional:

- Copy `.dev.vars.example` -> `.dev.vars` for `wrangler dev`
- Set these in `wrangler.toml`:
  - `CORS_ORIGIN` (recommended: your GitHub Pages origin)
  - `WORKER_PUBLIC_URL` (used in approval email links)
  - `RESEND_FROM`

## 5) Deploy Worker

```bash
npx wrangler deploy
```

Take the resulting Worker URL, then update repo-root `config.js`:

```js
window.EXI_API_BASE = "https://<your-worker>.workers.dev";
```

## 6) Publish frontend to GitHub Pages

Deploy static site as usual. Frontend will call Worker API via `apiFetch(...)`.

## Handy commands (repo root)

```bash
npm run worker:seed-export
npm run worker:dev
npm run worker:deploy
```

