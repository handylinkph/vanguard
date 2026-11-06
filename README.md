# Vanguard

**Disaster preparedness and community resilience for the Philippines.**
*“Ready at all times, all things, all places.”*

Vanguard is a mobile-first Progressive Web App that helps households, communities, schools and businesses plan, prepare and practise for typhoons, earthquakes, floods, volcanic eruptions, landslides, fires and tsunamis.

> Vanguard is a **preparedness and education** tool. It does **not** issue official alerts, monitor live hazards, dispatch rescuers, process payments, or coordinate emergency response. In an emergency, call **911**.

## Status at a glance

| | |
|---|---|
| Active modules in scope | 14 (Features 1, 3–10, 12, 14–17) |
| Deferred | #2 Certification & Training, #11 Volunteer & Relief Coordination, #13 Wearables |
| Automated tests | 31 unit · 20 database/RLS integration · 34 end-to-end (desktop + mobile, incl. axe accessibility and offline) — all passing |
| Static checks | TypeScript strict, ESLint, and a query-vs-schema checker (`npm run check:queries`) — all passing |
| Production build | `next build` passes |

See [`docs/PROGRESS.md`](docs/PROGRESS.md) for the per-feature tracker and [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) for exactly what has not been verified.

## Stack

- **Frontend:** Next.js 16 (App Router, Server Actions), React 19, TypeScript, Tailwind CSS v4, shadcn/ui-style components (hand-authored, `src/components/ui`), lucide icons, Inter
- **Backend:** Supabase (PostgreSQL, Auth, Storage) with row-level security on every table, SQL migrations, security-definer functions for invitations and administration
- **Offline:** hand-written service worker, Web App Manifest, IndexedDB (encrypted with a non-extractable AES-GCM key), outbox sync with version-based conflict detection
- **Maps:** MapLibre GL with OpenFreeMap tiles; facility search via OpenStreetMap (Overpass) and Nominatim from the user's browser
- **AI:** Anthropic Messages API, called server-side only (`/api/assistant`)
- **Tests:** Vitest (unit + PostgreSQL integration), Playwright + axe-core (E2E, accessibility, responsive, offline)

## Quick start (local development)

```bash
# 1. Install
npm install --legacy-peer-deps   # vitest/@types/node peer range quirk

# 2. Create a Supabase project (free tier) and apply the database
#    Either with the Supabase CLI:
npx supabase link --project-ref <ref>
npx supabase db push            # applies supabase/migrations/*
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
#    …or paste each file in supabase/migrations/ (in order) and then supabase/seed.sql into the SQL editor.

# 3. Configure
cp .env.example .env.local      # fill in NEXT_PUBLIC_SUPABASE_URL / ANON_KEY (+ optional secrets)

# 4. Run
npm run dev                     # http://localhost:3000
```

Make yourself a platform administrator (one-time, in the Supabase SQL editor):

```sql
update public.profiles set platform_role = 'platform_admin'
where id = (select id from auth.users where email = 'you@example.com');
```

Without Supabase credentials the app still runs: public guides, the offline page and the services hotline list work, and every account feature redirects to a clear **“not configured”** page instead of pretending to work.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Develop, build, serve |
| `npm run typecheck` / `lint` | TypeScript and ESLint |
| `npm run test:unit` | Domain logic: kits, assessment scoring, readiness, sync conflicts, AI guardrails, HTML escaping, drill scoring |
| `npm run test:db` | Builds a fresh PostgreSQL database from the **real migrations** and tests RLS, triggers and admin functions |
| `npm run check:queries` | Verifies every `.from().select()/.eq()/.rpc()` in the code against the migrated schema |
| `npm run test:e2e` | Playwright on desktop + mobile: public flows, accessibility (axe, WCAG 2 AA), overflow, PWA/offline |
| `npm run verify` | All of the above in sequence |

## Repository layout

```
src/
  app/(public)/      Landing, guides, library, services, offline, auth, invites, privacy
  app/(app)/         Signed-in app: dashboard, plans, kits, assessment, contacts, household,
                     finance, drills, assistant, community, organizations, incidents, settings, admin
  app/api/           assistant (AI), errors (client error reporting)
  components/        UI primitives, app shell, offline, plans, kits, drills, services map, assistant
  content/           Hazard guides, drill scenarios, plan/org templates (versioned educational content)
  lib/               Supabase clients, auth helpers, domain logic, offline store/sync, AI guardrails
supabase/
  migrations/        Schema, RLS policies, functions (apply in order)
  seed.sql           Initial library resources and national hotlines
  tests/             Local-only Supabase shim for integration tests
tests/               unit/, db/, e2e/
docs/                Architecture, database, deployment, testing, security, limitations, progress, checkpoint
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database schema & access model](docs/DATABASE.md)
- [Deployment (staging)](docs/DEPLOYMENT.md)
- [Testing](docs/TESTING.md)
- [Security & privacy notes](docs/SECURITY.md)
- [Known limitations](docs/KNOWN_LIMITATIONS.md)
- [Feature progress tracker](docs/PROGRESS.md)
- [Continuation checkpoint](docs/CHECKPOINT.md)
