# Security & privacy notes

## Controls implemented

| Area | Implementation |
|---|---|
| Authentication | Supabase Auth (email + password, email verification, PKCE recovery). Passwords ≥ 10 chars with letters and numbers. Generic responses on reset to prevent account enumeration. |
| Session handling | `@supabase/ssr` cookies, refreshed in `src/proxy.ts`. Disabled accounts are signed out in `requireUser()` and, when a service key is configured, banned at the auth layer. |
| Authorization | RLS on all 49 tables; helper functions are `SECURITY DEFINER` with fixed `search_path`; privileged RPCs check the caller and are revoked from `anon`. Server actions run as the user, never as service role. |
| Privilege escalation | Triggers block changing `platform_role`/`disabled`, household roles (non-admins), group ownership and org status (non-platform-admins). Admins cannot modify themselves. |
| Input validation | zod schemas in every server action; `CHECK` constraints in SQL (lengths, enums, ranges, https-only URLs). |
| Output encoding | React escaping; admin Markdown and plan exports are HTML-escaped with an allow-list (https links only) — unit tested for XSS. CSV exports neutralise formula injection. |
| File uploads | Server-side size limit (10 MB), **magic-byte sniffing** (JPEG/PNG/WEBP/PDF only), randomised object names, private bucket with per-user folder policies, short-lived signed URLs (10 min). |
| Secrets | Only `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` reach the browser. `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` are read only in server code (`server-only` imports). |
| Transport & headers | HTTPS (host), HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (geolocation self only). |
| Rate limiting | AI: per-user hourly limit (configurable, default 30). Client error reports: per-IP limit. Auth: Supabase built-in limits. |
| Audit | Admin role/status changes, moderation decisions, org/group suspension, library/directory edits and configuration changes write to `audit_logs` (admin-readable). |
| Error tracking | Client and server errors stored in `error_events` (no record contents). |

## Privacy by design (Data Privacy Act of 2012, RA 10173 — for legal review)

- **Private by default:** incident records, finances, assessments, AI chats and personal contacts are owner-only. Sharing with a household is an explicit choice.
- **Administrators** see aggregate metrics, account basics (name, email, dates) and only community content that has been reported. They cannot read households, plans, kits, incidents or finances.
- **Minors:** accounts are for adults; children appear only as dependents (name + age group). Care notes are optional and household-only.
- **Consent** captured at sign-up; group display name and aggregate-metrics participation are user-controlled.
- **Access & portability:** one-click JSON export of all personal data. **Erasure:** account deletion removes personal rows and stored files.
- **Location:** browser geolocation is used only on the services map, on demand, and never stored.
- **Offline data:** encrypted in IndexedDB with a non-extractable key; wiped at sign-out or account switch. Incident records are never stored offline. Public guide pages cached by the service worker can include which guides a signed-in user saved; these caches are also cleared at sign-out.

## Recommended before public launch

- Independent penetration test and a Data Privacy Act compliance review (privacy notice, DPO registration with the NPC if applicable, retention schedule).
- Custom SMTP with SPF/DKIM; enable Supabase leaked-password protection and consider MFA for platform admins.
- Content Security Policy (nonce-based) once third-party map/tile origins are finalised.
- Move the error-report rate limiter to a shared store (current one is per server instance).
- Restrict `error_events` inserts to the `/api/errors` route only (currently anon may insert via the API with length limits).
