# Feature progress tracker

Updated 7 November 2026. Classifications follow the master prompt. A feature is only marked **Complete and tested** when it meets its requirements *and* has passing test evidence for its user-facing flow. Because no live Supabase Auth/Storage server was reachable during development, every module that requires sign-in is classified **Implemented but untested** at the overall level even where its database rules and logic are fully tested.

Legend for layer columns: ✅ tested · 🟡 implemented, not yet tested end-to-end · — not applicable

| # | Feature | Overall status | Backend (server actions / API) | Frontend | Database (schema + RLS) | Testing evidence | Known issues |
|---|---|---|---|---|---|---|---|
| 1 | Emergency Preparedness Plans | Implemented but untested | 🟡 | 🟡 guided 6-step wizard, templates, checklist (online/offline), reminders, duplicate/archive/delete, print, HTML/JSON download, household sharing | ✅ | DB: sharing, member tick-only, versioning. Unit: export escaping, row parsing | Needs staging E2E |
| 3 | Disaster Information & Guidance | **Complete and tested** | — (static content) | ✅ directory, 8 guides, search/filter, before/during/after, checklists, saved items, official source links, educational banner | ✅ (saved items, checklist progress) | E2E: search, filter, detail, sources, a11y, offline cache. Unit: search | Content needs expert review; saving/checklist ticking requires sign-in (untested E2E) |
| 4 | Personalized Risk Assessment | Implemented but untested | 🟡 | 🟡 location + hazards, questionnaire, scoring, factors, recommendations → add to plan, history, print | ✅ | Unit: scoring, weighting, hazard filtering | Measures preparedness only (by design) |
| 5 | Emergency Kit Builder | Implemented but untested | 🟡 | 🟡 3-day/7-day/home/go-bag/custom, household sizing, special needs, quantities, packing, expiry, reminders, shopping list with ₱ estimates, multiple kits, print, offline | ✅ | Unit: sizing, readiness, expiry, shopping list. DB: household sharing | Needs staging E2E |
| 6 | Community & Group Collaboration | Implemented but untested | 🟡 | 🟡 groups, invite links, members/roles, announcements, discussions, comments, shared checklist, tasks, events, reporting & moderation | ✅ | DB: membership isolation, coordinator rules, report-scoped admin visibility, owner protection | Assignee can edit whole task row |
| 7 | Resource Library | Implemented but untested | 🟡 | 🟡 public list/detail, search, category/hazard filters, favourites, review dates, sources, downloads, admin CMS | ✅ | DB: public read/admin write + audit. Unit: Markdown XSS. E2E: page renders "not configured" state | 12 seeded resources need expert review |
| 8 | Interactive Drills & Simulations | Implemented but untested | 🟡 | 🟡 5 scenarios, decision simulations with feedback, household drills with timer/checklist/reflection, scheduling, history | ✅ | Unit: scoring, suggestions, tamper resistance | No certification (by design) |
| 9 | Offline Access | Implemented but untested | — | ✅ PWA manifest & SW; 🟡 authenticated snapshot/outbox UI | ✅ (versions) | E2E: installable manifest, SW caches guides, offline fallback. Unit: conflict resolution, coalescing, sanitising. DB: optimistic concurrency | Authenticated IndexedDB round-trip untested in a browser |
| 10 | Location-Based Emergency Services Directory | Implemented but untested | 🟡 | ✅ hotlines, disclaimers; 🟡 MapLibre map, geolocation, Nominatim search, Overpass facilities, filters, tel/directions links | ✅ | E2E: 911 hotline, not-dispatch notice, a11y. DB: admin-only writes | Map/OSM not tested (no network); directory nearly empty |
| 12 | AI-Powered Preparedness Assistant | Implemented but untested | 🟡 server route, retrieval, personalisation, rate limit, logging | 🟡 chat, conversations, sources, unconfigured state | ✅ | Unit: urgent detection, prompt guardrails, retrieval | Not run against the live model |
| 14 | Personal Incident Documentation | Implemented but untested | 🟡 | 🟡 create/edit/delete, categories, dates, location, damage (₱), recovery tasks, photo/PDF uploads, search, JSON export | ✅ | DB: owner-only (household & admins denied), storage folder isolation | Storage upload untested E2E |
| 15 | Emergency Planning for Businesses & Schools | Implemented but untested | 🟡 | 🟡 org profiles, admins/members, invites, plan templates, assignments, contacts, facilities, 4 checklists, drills with results, readiness dashboard, printable report | ✅ | DB: admin/member split, suspension. Unit: org readiness | Needs staging E2E |
| 16 | Financial Preparedness Tools | Implemented but untested | 🟡 | 🟡 savings goals & contributions, budgets (incl. from kit shopping list), expenses (prep/recovery, linked to incidents/kits), checklist, summaries, PHP | ✅ | DB: owner-only | Needs staging E2E |
| 17 | Administration & Analytics | Implemented but untested | 🟡 | 🟡 metrics dashboard, users & roles, disable, content CMS, directory CMS, moderation, org/group suspension, errors, audit log, configuration, CSV exports | ✅ | DB: function authorization, aggregate-only metrics, audit trail, no self-modification, admins blocked from private data | User export capped at 200 |
| — | Accounts, households, privacy (shared) | Implemented but untested | 🟡 | 🟡 sign-up/in, verification, recovery, profile, households, dependents, pets, invites, contacts, privacy settings, data export, account deletion, onboarding, dashboard | ✅ | DB: profile privacy, invites, roles, export, deletion cascade. E2E: auth pages render, consent validation, a11y | Needs staging E2E |

## Deferred / out of scope

| Item | Status |
|---|---|
| #2 Certification & Training Programs | **Deferred** |
| #11 Volunteer & Relief Coordination | **Deferred** |
| #13 Wearable & Smart Device Integrations | **Deferred** |
| Official alert feeds, automated warnings | Out of current scope |
| Emergency dispatch, rescue requests, real-time/inter-agency coordination | Out of current scope |
| Payment processing, subscriptions, sales, bank connections | Out of current scope |
| Device integrations, government integrations requiring approval | Out of current scope |
