# Architecture

## Overview

```
Browser (PWA)
 ├─ Next.js pages (React Server Components) ──► Server Actions / Route Handlers ──► Supabase (Postgres + RLS, Auth, Storage)
 ├─ Client components ── supabase-js (RLS-scoped, user JWT) ──────────────────────► Supabase
 ├─ Service worker: caches app shell + PUBLIC pages only
 ├─ IndexedDB: encrypted offline snapshot + outbox (offline edits) + conflicts
 └─ Map: MapLibre (OpenFreeMap tiles), Overpass/Nominatim (OSM) called directly from the browser

Server-only
 ├─ /api/assistant ──► Anthropic Messages API (key never sent to the browser)
 ├─ /api/errors ──► error_events table
 └─ Service-role client: ONLY for account deletion and auth bans
```

## Principles

1. **Authorization lives in the database.** Every table has row-level security. Server actions use the signed-in user's JWT, so a bug in UI code cannot expose another user's data. Cross-entity operations (accepting invitations, admin actions, aggregated metrics) are `SECURITY DEFINER` functions that check the caller explicitly and write audit logs.
2. **Validate at the edge, constrain at the core.** Server actions validate input with zod; the schema repeats key constraints (lengths, enums, ranges) with `CHECK` constraints.
3. **One data model, many views.** Modules share tables and helpers instead of keeping private copies:
   - Assessment recommendations → added as plan checklist items (`addRecommendationToPlan`)
   - Kit readiness, plan checklist progress, contacts, assessment, drills and savings → one readiness model (`src/lib/readiness.ts`) on the dashboard
   - Kit shopping-list estimates → seed a supply budget in Financial Preparedness
   - Incident records ↔ recovery expenses
   - Every module writes to `activity_log`, shown on the dashboard (own + household)
   - Plans, kits and drill schedules create `reminders` (review dates, expiry, scheduled drills)
   - Household composition sizes kits and personalises the assessment and AI assistant
4. **Honest states.** Missing configuration (no Supabase, no AI key, no service-role key) produces explicit "not configured" UI, never fake success.

## Module map

| Feature | Routes | Key files |
|---|---|---|
| 1 Emergency plans | `/plans`, `/plans/new`, `/plans/[id]?step=…`, `/plans/[id]/print`, `/plans/[id]/download` | `app/(app)/plans/*`, `components/plans/checklist.tsx`, `lib/plan-export.ts`, `content/templates.ts` |
| 3 Disaster information | `/guides`, `/guides/[key]` | `content/guides.ts` |
| 4 Risk assessment | `/assessment`, `/assessment/take`, `/assessment/[id]` | `lib/assessment.ts` |
| 5 Kit builder | `/kits`, `/kits/new`, `/kits/[id]` | `lib/kits.ts`, `components/kits/inventory.tsx` |
| 6 Community | `/community`, `/community/[id]`, `/invite/group/[token]` | `app/(app)/community/*` |
| 7 Resource library | `/library`, `/library/[slug]`, `/admin/content` | `lib/markdown.ts`, `seed.sql` |
| 8 Drills | `/drills`, `/drills/[key]` | `content/scenarios.ts`, `components/drills/*` |
| 9 Offline | `/offline`, `public/sw.js` | `lib/offline/*`, `components/offline/*` |
| 10 Services directory | `/services`, `/admin/services` | `components/services/finder.tsx` |
| 12 AI assistant | `/assistant`, `/api/assistant` | `lib/ai/*`, `components/assistant/chat.tsx` |
| 14 Incident records | `/incidents`, `/incidents/[id]`, `/incidents/export` | `app/(app)/incidents/*` |
| 15 Businesses & schools | `/organizations`, `/organizations/[id]`, `/organizations/[id]/report` | `lib/org.ts` |
| 16 Financial | `/finance` | `app/(app)/finance/*` |
| 17 Administration | `/admin/*` | `app/(app)/admin/*`, SQL `admin_*` functions |
| Shared | `/household`, `/contacts`, `/settings`, `/onboarding`, auth pages | `lib/auth.ts`, `proxy.ts` |

## Roles

| Role | Where it lives | Grants |
|---|---|---|
| Individual user | default | own data |
| Household administrator / member | `household_members.role` | admin: manage household, dependents, invites, shared plans; member: view shared plans & kits, tick checklists, update kit quantities |
| Community coordinator | `group_members.role` = owner/coordinator | announcements, tasks, events, invites, moderation of their group |
| Business / school administrator | `org_members.role = admin` on an org with `org_type` business/school | manage the organization's plans, facilities, checklists, drills, members |
| Platform administrator | `profiles.platform_role` | admin console: metrics (aggregated), users & roles, content, directory, moderation (reported items only), org/group suspension, errors, audit, configuration |

## Offline design (Feature 9)

- **App shell & public content:** `public/sw.js` precaches `/offline` and all guide pages, caches build assets cache-first, and serves network-first navigations with an `/offline` fallback. Authenticated HTML is **never** cached.
- **Personal essentials:** after sign-in, `refreshSnapshots()` stores plans + checklist, contacts, kits + items, hotlines and saved items in IndexedDB, encrypted with AES-GCM using a non-extractable key generated on the device. Incident records are deliberately excluded.
- **Offline edits:** checklist ticks and kit quantities/packed status are queued in an outbox (`enqueue`) with the row's `version`. Edits to the same row coalesce while keeping the original base version.
- **Sync & conflicts:** on reconnect `flushOutbox()` compares versions (`lib/offline/sync-core.ts`). Unchanged → apply with an `eq("version", base)` guard; same value → no-op; both changed → **conflict** surfaced on `/offline` with “Keep my change” / “Keep server version”; deleted → reported.
- **Privacy:** signing out (or a different user signing in on the device) wipes IndexedDB and Vanguard caches.
