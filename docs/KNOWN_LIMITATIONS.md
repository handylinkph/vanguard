# Known limitations

Stated plainly so nothing is mistaken for working when it hasn't been verified.

## Verification gaps (environment)

1. **No live Supabase was available while building.** Migrations, RLS, triggers and admin functions were verified on PostgreSQL 16 using a minimal shim of Supabase's `auth`/`storage` schemas. Signed-in UI flows, Supabase Auth emails, PostgREST behaviour and Storage uploads have **not** been exercised end-to-end. Run the staging smoke test in `DEPLOYMENT.md`.
2. **AI assistant** has not been called against the live model (no API key in the build environment). The unconfigured state, guardrails and retrieval are tested.
3. **Maps and OSM search** were not tested (outbound access blocked). The page degrades to a list with a clear message if tiles or search fail.

## Product limitations (current scope)

- **Invitations are shareable links**, not emails. Vanguard does not send emails other than Supabase Auth messages.
- **Reminders are in-app only** (dashboard). No push, SMS or email notifications.
- **Offline editing** is limited to plan checklist ticks and kit quantities/packed status. Creating or deleting records needs a connection. Incident records are online-only by design (privacy).
- **"Download" for plans** produces a standalone HTML file (and JSON). PDF is via the browser's *Print → Save as PDF*.
- **Data export** includes incident attachment metadata; files themselves are downloaded per record.
- **Language:** the interface and content are English. Filipino/regional-language content is supported by the library schema (`language` field) but not yet written.
- **Content review:** hazard guides and library entries are original drafts written for Vanguard and **must be reviewed by a qualified DRRM professional** before public launch. Hotline entries (911, Philippine Red Cross 143) are marked *unverified* until an administrator confirms them.
- **Directory data:** the curated directory starts nearly empty; facility discovery relies on OpenStreetMap, which is community-maintained and may be incomplete. Evacuation-centre status is never shown.
- **Risk assessment** measures preparedness actions only. No geographic hazard datasets (e.g. official hazard maps) are integrated.
- **Group task assignees** can edit any field of a task assigned to them (row-level, not column-level, permission).
- **Admin user export** returns up to 200 users per file.
- **Supabase types** are not generated; queries are checked by `npm run check:queries` instead.
- **Performance** (Lighthouse, load testing) has not been measured.

## Explicitly out of scope (not built, no fake versions)

Live official alert feeds · automated warnings · emergency dispatch or rescue requests · real-time response or inter-agency coordination · payments, subscriptions, product sales · bank connections · government integrations requiring approval · wearables/smart devices · Feature #2 Certification & Training · Feature #11 Volunteer & Relief Coordination · Feature #13 Wearable Integrations.
