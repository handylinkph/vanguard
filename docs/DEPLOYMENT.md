# Deployment (staging)

No production deployment has been made, and nothing has been deployed on any paid service. These steps prepare a **free-tier staging** environment. Run them yourself, or authorise me to run them.

## 1. Supabase (free tier)

1. Create a project at supabase.com (region: Singapore is closest to the Philippines).
2. Apply the schema:
   - **CLI:** `npx supabase link --project-ref <ref>` then `npx supabase db push`
   - **or SQL editor:** run each file in `supabase/migrations/` in filename order.
3. Seed content: run `supabase/seed.sql`.
4. **Auth settings** (Authentication → URL Configuration):
   - Site URL: your staging URL (e.g. `https://vanguard-staging.netlify.app`)
   - Redirect URLs: `https://<staging-host>/auth/callback`, `https://<staging-host>/auth/confirm`, and `http://localhost:3000/auth/callback` for development
   - Keep **email confirmation ON**.
   - Recommended: configure custom SMTP before inviting real testers (Supabase's default sender is rate-limited).
5. Storage: the migration creates the private `incident-files` bucket. Confirm it exists and is **not public**.
6. Copy the Project URL, anon key and service-role key (Settings → API).

## 2. Hosting (Netlify or Vercel free tier)

Set environment variables (see `.env.example`):

| Variable | Scope |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` | build + runtime (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | runtime, **secret** — enables account deletion and auth bans |
| `ANTHROPIC_API_KEY` (optional `AI_MODEL`) | runtime, **secret** — enables the AI assistant (usage is billed by the provider) |

`NEXT_PUBLIC_*` values are inlined at build time — rebuild after changing them.

- **Vercel:** import the repository; framework auto-detected. Build command `npm run build`, install command `npm install --legacy-peer-deps`.
- **Netlify:** the Next.js runtime is auto-detected; set the same install/build commands.

## 3. First administrator

```sql
update public.profiles set platform_role = 'platform_admin'
where id = (select id from auth.users where email = 'you@example.com');
```

## 4. Smoke test after deploy

1. Sign up → verify email → land on onboarding.
2. Create a household, add a dependent, create an invite link and accept it from a second account.
3. Create a plan from a template, fill steps, activate, print and download.
4. Build a 3-day kit, change quantities, check readiness and shopping list.
5. Take the assessment; add a recommendation to the plan.
6. Toggle airplane mode: open `/offline`, tick a checklist item, reconnect, confirm it synced.
7. Upload a photo to an incident record; confirm a second account cannot see it.
8. As admin: view metrics, publish a resource, add a directory listing, review audit log.

## Cost notes

All of the above fits within free tiers for a staging pilot. Costs arise only from: the AI provider (per token), Supabase/hosting if you exceed free quotas, and custom email (SMTP) if you choose a paid provider. Map tiles (OpenFreeMap) and OSM search are free but have fair-use policies — for a public launch, consider a dedicated tile plan.
