# Testing

Last full run: **7 November 2026** — `npm run verify` exit code 0.

| Layer | Command | Result | What it proves |
|---|---|---|---|
| Types | `npm run typecheck` | ✅ pass | Strict TypeScript across app, tests, config |
| Lint | `npm run lint` | ✅ 0 errors, 0 warnings | Next.js + React Compiler rules (impure render, effects) |
| Unit | `npm run test:unit` | ✅ 31 / 31 | Kit sizing, readiness & expiry, shopping list; assessment scoring, hazard filtering, dependent weighting; household & org readiness; offline conflict resolution, coalescing, patch sanitising; AI urgent-situation detection, prompt guardrails, retrieval; Markdown & plan-export HTML escaping (XSS); repeater row parsing; drill scoring and tamper resistance |
| Database / RLS | `npm run test:db` | ✅ 20 / 20 | Builds PostgreSQL 16 from the **real migrations**, then as different users verifies: profile privacy & no self-promotion; household isolation, invite acceptance (anon rejected, single-use), admin-only dependents, last-admin guard; private vs shared contacts and plans; members tick but can't edit plans; version-based concurrency; household kit sharing; **incident records invisible to household members and platform admins**; storage folder isolation; group membership, coordinator-only announcements, admins see **only reported** posts, moderation hides content with audit; owner-role takeover blocked; org admin/member split, suspension, admin can't read org data; admin functions reject non-admins, metrics are aggregate-only, admins can't read households/plans/finances; role changes audited, no self-modification; public content read/admin-only write (audited); per-user data export; account deletion cascades while shared households survive |
| Query/schema | `npm run check:queries` | ✅ 139 files | Every `.from().select()`, filter column and `.rpc()` in the code exists in the migrated schema (verified to catch deliberate typos) |
| Build | `npm run build` | ✅ | Production build of all 70+ routes |
| End-to-end | `npm run test:e2e` | ✅ 34 / 34 (17 × desktop + mobile) | Landing scope & no fabricated alerts; guide search/filter/detail with official sources; protected routes → honest "not configured" page; 911 hotline & not-dispatch disclaimer; signup consent validation; **axe WCAG 2 A/AA: no serious/critical violations on 10 pages**; no horizontal overflow; manifest installability; **service worker serves cached guides offline and falls back to `/offline` for uncached/private pages** |

## Not covered by automated tests (and why)

The build environment had no reachable Supabase stack (Docker images and GitHub releases were blocked), no AI API key, and no outbound access to map/OSM services. Therefore these were **not** executed end-to-end:

- Sign-up/email verification/password reset against Supabase Auth
- Server actions and pages that require a signed-in session (plans wizard, kits, assessment, community, organizations, finance, incidents, admin UI, settings/export/deletion)
- Storage uploads through the Supabase Storage API
- Authenticated offline snapshot → IndexedDB → outbox → sync round-trip in a browser
- AI assistant responses from the live model
- Map tile rendering and OSM facility search

The database rules those flows depend on **are** tested (above), and the query checker validates the queries those pages issue. See `docs/DEPLOYMENT.md` → *Smoke test after deploy* for the manual checklist to run on staging, and `docs/CHECKPOINT.md` for adding authenticated Playwright tests once a staging project exists.

## Running locally

```bash
# Postgres 16 on localhost with user postgres/postgres (or set TEST_DATABASE_URL)
npm run test:db
# Chrome or Chromium (set CHROME_PATH if not /usr/bin/google-chrome)
npm run build && npm run test:e2e
```
