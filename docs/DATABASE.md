# Database schema & access model

Migrations live in `supabase/migrations/` and must be applied in filename order. 49 tables, all with RLS enabled.

| Migration | Contents |
|---|---|
| `…0100_core.sql` | profiles (+signup trigger, self-promotion guard), households, members, pets, invites, emergency contacts, activity log, reminders, saved items, checklist progress, audit logs, error events, app settings |
| `…0200_preparedness.sql` | emergency plans + checklist items (versioned), risk assessments, kits + kit items (versioned), drill runs & schedules |
| `…0300_community.sql` | groups, members, invites, posts, comments, content reports, tasks, shared checklists, events |
| `…0400_content_services_incidents.sql` | resources (library CMS), services directory, CMS audit trigger, incident records + attachments, private `incident-files` storage bucket and policies |
| `…0500_orgs_finance_ai_admin.sql` | organizations (+ members, invites, plans, contacts, facilities, assignments, checklists, drills), savings goals/contributions, budgets/lines, expenses, AI conversations/messages, admin functions, grants |
| `…0600_hardening.sql` | last-household-admin guard, empty-household cleanup, `my_data_export()`, configuration audit trigger |

## Entity overview

```
auth.users 1─1 profiles
profiles 1─* household_members *─1 households 1─* household_pets / household_invites
profiles 1─* emergency_contacts (optional household_id → shared)
profiles 1─* emergency_plans 1─* plan_checklist_items      (household_id + shared_with_household → shared)
profiles 1─* kits 1─* kit_items                              (household_id → shared with members)
profiles 1─* risk_assessments, drill_runs, drill_schedules, reminders, saved_items, checklist_progress, activity_log
profiles 1─* incident_records 1─* incident_attachments ── storage: incident-files/<user_id>/<incident_id>/<file>
profiles 1─* savings_goals 1─* savings_contributions; budgets 1─* budget_lines; expenses (→ budget/incident/kit)
groups 1─* group_members, group_invites, group_posts 1─* group_comments, content_reports, group_tasks, group_checklist_items, group_events
organizations 1─* org_members, org_invites, org_plans, org_contacts, org_facilities, org_assignments, org_checklist_items, org_drills
ai_conversations 1─* ai_messages
resources, services, app_settings (platform-managed), audit_logs, error_events
```

## Access model (RLS summary)

| Data | Who can read | Who can write |
|---|---|---|
| profile | self | self (role/disabled only via admin function) |
| household & members | household account members | admins (members may edit their own details) |
| contacts | owner; household members if shared | owner; household admins if shared |
| plans | owner; household members if `shared_with_household` | owner; household admins if shared. Checklist ticks: anyone who can view |
| kits & items | owner; household members if `household_id` set | same (members can update quantities) |
| assessments, drills, reminders, finance, AI chats, saved items | owner only | owner only |
| **incident records & files** | **owner only** — no policy for household, groups or admins | owner only |
| groups | members (admins see only reported items) | coordinators; members post discussions / comments / reports |
| organizations | members of active orgs | org admins; assignees update their assignment |
| resources / services | everyone (published); admins (all) | platform admins (audited) |
| audit logs, error events | platform admins | functions/triggers; error events insertable by clients |

## Functions

- Invitations: `preview_*_invite(token)` (public preview), `accept_*_invite(token)` (signed-in only)
- Authorization helpers: `is_platform_admin`, `is_household_member/admin`, `can_view_plan`, `can_edit_plan`, `can_view_kit`, `group_role`, `is_group_member/coordinator`, `is_org_member/admin`
- Administration (all check `is_platform_admin()` and audit writes): `admin_metrics` (aggregates only), `admin_list_users`, `admin_set_user`, `admin_list_orgs`, `admin_set_org_status`, `admin_list_groups`, `admin_set_group_status`, `admin_resolve_report`, `admin_reported_content`
- Privacy: `my_data_export()` (security invoker — RLS applies)

## Versioning for offline sync

`plan_checklist_items`, `kit_items` and `emergency_plans` carry a `version` column incremented by trigger on every update. Offline edits are applied only if the version still matches.
