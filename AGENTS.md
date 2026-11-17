# Running this repo in the Base44 sandbox

Single Vite + React SPA (`src/`) that talks to a **hosted Supabase** project — no
local database. There is no in-repo backend to run; `api/` holds Vercel-style
serverless functions and `supabase/functions` holds edge functions, both deployed
to their hosts, not executed locally.

- Start: `docker compose -f docker-compose.base44.yml up -d` (Vite dev server on
  host port 3000, source bind-mounted, `npm ci` on startup in a named
  `node_modules` volume).
- Required secrets (delivered at `/run/base44/app.env`): `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`. `VITE_VAPID_PUBLIC_KEY` is optional (push only).
  Vite inlines them at startup, so after a secret change the service is recreated.
- Data/auth live in the external Supabase project; an empty or failing sign-in
  means bad/missing Supabase credentials, not a broken local stack.
- Verify: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` and load
  the home page (marketplace listing + category filters).

## Project rules (always follow)

- Supabase is the only backend. Never use the Base44 SDK, Base44 entities,
  Base44 auth or `InvokeLLM`. All data access goes through the existing
  Supabase client in `src/`.
- Never put the Supabase `service_role` / secret key in frontend code or in
  any `VITE_` variable. Privileged logic goes in `supabase/functions` (Edge
  Functions) or `api/`.
- Any database change (table, column, RLS policy, function) must be written
  as a new SQL file in `supabase/migrations/` and mentioned in the pull
  request description. Never assume it has been applied.
- Row Level Security must stay enabled on every table.
- The preview uses the PRODUCTION Supabase database: never run destructive
  operations (DELETE, DROP, TRUNCATE, bulk updates) from the preview.
- Always start work from the latest `main`.
