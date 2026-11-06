# Continuation checkpoint

**Session end:** 7 November 2026. State: all code for the 14 active modules written; `npm run verify` passes (typecheck, lint, 31 unit, 20 DB/RLS, query check, build, 34 E2E).

## Where things are

- App code: `src/` (see `docs/ARCHITECTURE.md` module map)
- Schema: `supabase/migrations/2026110700{01..06}00_*.sql`, seed in `supabase/seed.sql`
- Tests: `tests/unit`, `tests/db` (builds DB from migrations), `tests/e2e`
- Tracker: `docs/PROGRESS.md`; gaps: `docs/KNOWN_LIMITATIONS.md`

## Decisions made (and why)

- **Next.js 16 with Cache Components OFF** and `force-dynamic` route groups: nearly all pages are per-user; avoids prerendering redirects when env is absent.
- **Authorization in Postgres RLS**, server actions as the user; service role only for account deletion/bans.
- **shadcn/ui-style components hand-written** (`src/components/ui`) — the shadcn registry wasn't reachable; same conventions (cva + cn), easy to swap for generated ones.
- **Hand-written service worker** instead of a plugin (plugin compatibility with Next 16/Turbopack uncertain); never caches authenticated HTML.
- **Offline personal data in encrypted IndexedDB**, edits via versioned outbox.
- **Invites are links** (no email provider in scope).
- **Hazard guides are code-versioned content**; the **library is DB-managed** by admins.

## Next steps, in order

1. **Create a free Supabase staging project** and apply migrations + seed (`docs/DEPLOYMENT.md`). Promote an admin.
2. **Deploy to a free host** (Vercel/Netlify) with env vars. Run the smoke test checklist.
3. **Add authenticated Playwright tests** against staging: create two test users via the Supabase admin API in a global setup, store `storageState`, and cover: household invite → shared plan tick; kit offline edit → sync; assessment → add to plan; incident upload privacy; group report → admin hide; org drill → readiness; data export; account deletion. Move the relevant PROGRESS rows to *Complete and tested* as each passes.
4. Set `ANTHROPIC_API_KEY` on staging and evaluate the assistant with a fixed question set (including urgent-situation prompts).
5. Have a DRRM professional review `src/content/guides.ts`, `src/content/scenarios.ts`, `supabase/seed.sql`; verify hotline numbers and mark them verified in the admin console.
6. Populate the curated services directory for pilot LGUs (with sources and review dates).
7. Before public launch: items under *Recommended before public launch* in `docs/SECURITY.md`, Filipino translations, Lighthouse/performance pass.

## Resuming a session

```bash
npm install --legacy-peer-deps
sudo pg_ctlcluster 16 main start   # or any Postgres 16 with postgres/postgres
npm run verify
```
