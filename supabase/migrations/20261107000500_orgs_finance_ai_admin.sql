-- Organizations (Feature 15), Finance (Feature 16), AI assistant (Feature 12), Admin (Feature 17)

-- ---------------------------------------------------------------------------
-- Organizations: businesses and schools
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 200),
  org_type text not null check (org_type in ('business', 'school')),
  sector text check (char_length(sector) <= 100),
  address text check (char_length(address) <= 300),
  region text, city text,
  headcount int check (headcount >= 0),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger orgs_updated before update on public.organizations for each row execute function public.set_updated_at();

create table public.org_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  display_name text not null default 'Member',
  title text check (char_length(title) <= 100),
  joined_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index on public.org_members (user_id);

create or replace function public.is_org_member(oid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.org_members m join public.organizations o on o.id = m.org_id
                 where m.org_id = oid and m.user_id = auth.uid() and o.status = 'active')
$$;
create or replace function public.is_org_admin(oid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.org_members m join public.organizations o on o.id = m.org_id
                 where m.org_id = oid and m.user_id = auth.uid() and m.role = 'admin' and o.status = 'active')
$$;

create or replace function public.org_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.org_members (org_id, user_id, role, display_name, title)
  values (new.id, new.created_by, 'admin',
          coalesce(nullif((select full_name from public.profiles where id = new.created_by), ''), 'Administrator'),
          'Preparedness administrator');
  return new;
end $$;
create trigger orgs_add_admin after insert on public.organizations for each row execute function public.org_after_insert();

alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
create policy orgs_select on public.organizations for select
  using (exists (select 1 from public.org_members m where m.org_id = id and m.user_id = auth.uid()));
create policy orgs_insert on public.organizations for insert with check (created_by = auth.uid() and status = 'active');
create policy orgs_update on public.organizations for update using (public.is_org_admin(id));
create policy orgs_delete on public.organizations for delete using (public.is_org_admin(id) and created_by = auth.uid());

create or replace function public.protect_org_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and not public.is_platform_admin() then
    raise exception 'Only platform administrators can change organization status';
  end if;
  return new;
end $$;
create trigger orgs_protect before update on public.organizations for each row execute function public.protect_org_status();

create policy om_select on public.org_members for select using (public.is_org_member(org_id));
create policy om_update on public.org_members for update using (public.is_org_admin(org_id));
create policy om_delete on public.org_members for delete using (public.is_org_admin(org_id) or user_id = auth.uid());

create table public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  token text not null unique default public.new_token(),
  role text not null default 'member' check (role in ('admin', 'member')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  max_uses int not null default 50 check (max_uses between 1 and 2000),
  uses int not null default 0,
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now()
);
alter table public.org_invites enable row level security;
create policy oinv_admin on public.org_invites for all using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id) and created_by = auth.uid());

create or replace function public.preview_org_invite(p_token text)
returns table (org_name text, org_type text, role text, valid boolean)
language sql stable security definer set search_path = public as $$
  select o.name, o.org_type, i.role, (i.uses < i.max_uses and i.expires_at > now() and o.status = 'active')
  from public.org_invites i join public.organizations o on o.id = i.org_id where i.token = p_token
$$;

create or replace function public.accept_org_invite(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv public.org_invites; uname text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into inv from public.org_invites where token = p_token for update;
  if not found then raise exception 'Invitation not found'; end if;
  if inv.uses >= inv.max_uses or inv.expires_at < now() then raise exception 'Invitation is no longer valid'; end if;
  select coalesce(nullif(full_name, ''), 'Member') into uname from public.profiles where id = auth.uid();
  insert into public.org_members (org_id, user_id, role, display_name)
  values (inv.org_id, auth.uid(), inv.role, uname) on conflict do nothing;
  if found then update public.org_invites set uses = uses + 1 where id = inv.id; end if;
  return inv.org_id;
end $$;

create table public.org_plans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  template_key text not null,
  hazard text not null default 'all',
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  sections jsonb not null default '{}'::jsonb,
  review_on date,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger org_plans_updated before update on public.org_plans for each row execute function public.set_updated_at();

create table public.org_contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) <= 120),
  role text check (char_length(role) <= 120),
  phone text check (char_length(phone) <= 40),
  email text check (char_length(email) <= 200),
  is_external boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.org_facilities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) <= 200),
  address text check (char_length(address) <= 300),
  occupancy int check (occupancy >= 0),
  floors int check (floors >= 0),
  assembly_points text check (char_length(assembly_points) <= 1000),
  evacuation_routes text check (char_length(evacuation_routes) <= 2000),
  equipment text check (char_length(equipment) <= 2000),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);

create table public.org_assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 1000),
  assignee_id uuid references public.profiles(id) on delete set null,
  due_on date,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger org_assign_updated before update on public.org_assignments for each row execute function public.set_updated_at();

create table public.org_checklist_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  list_key text not null default 'evacuation' check (list_key in ('evacuation', 'continuity', 'supplies', 'communication')),
  label text not null check (char_length(label) <= 300),
  done boolean not null default false,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.org_drills (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(title) <= 200),
  drill_type text not null check (drill_type in ('earthquake', 'fire', 'flood', 'typhoon', 'tsunami', 'lockdown', 'other')),
  scheduled_for date not null,
  completed_on date,
  participants int check (participants >= 0),
  evacuation_minutes numeric(6,2) check (evacuation_minutes >= 0),
  observations text check (char_length(observations) <= 3000),
  created_at timestamptz not null default now()
);

alter table public.org_plans enable row level security;
alter table public.org_contacts enable row level security;
alter table public.org_facilities enable row level security;
alter table public.org_assignments enable row level security;
alter table public.org_checklist_items enable row level security;
alter table public.org_drills enable row level security;

create policy op_select on public.org_plans for select using (public.is_org_member(org_id));
create policy op_write on public.org_plans for all using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));
create policy oc_select on public.org_contacts for select using (public.is_org_member(org_id));
create policy oc_write on public.org_contacts for all using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));
create policy of_select on public.org_facilities for select using (public.is_org_member(org_id));
create policy of_write on public.org_facilities for all using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));
create policy oa_select on public.org_assignments for select using (public.is_org_member(org_id));
create policy oa_insert on public.org_assignments for insert with check (public.is_org_admin(org_id));
create policy oa_update on public.org_assignments for update using (public.is_org_admin(org_id) or (assignee_id = auth.uid() and public.is_org_member(org_id)));
create policy oa_delete on public.org_assignments for delete using (public.is_org_admin(org_id));
create policy ocl_select on public.org_checklist_items for select using (public.is_org_member(org_id));
create policy ocl_write on public.org_checklist_items for all using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));
create policy od_select on public.org_drills for select using (public.is_org_member(org_id));
create policy od_write on public.org_drills for all using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));

-- ---------------------------------------------------------------------------
-- Financial preparedness (PHP). No bank connections or transactions.
-- ---------------------------------------------------------------------------
create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  target_php numeric(14,2) not null check (target_php > 0),
  target_date date,
  created_at timestamptz not null default now()
);
create table public.savings_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.savings_goals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_php numeric(14,2) not null check (amount_php <> 0),
  note text check (char_length(note) <= 200),
  contributed_on date not null default current_date
);
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  kind text not null default 'preparedness' check (kind in ('preparedness', 'supplies', 'recovery')),
  created_at timestamptz not null default now()
);
create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (char_length(category) <= 60),
  label text not null check (char_length(label) <= 160),
  planned_php numeric(14,2) not null default 0 check (planned_php >= 0)
);
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('preparedness', 'recovery')),
  category text not null check (char_length(category) <= 60),
  description text not null check (char_length(description) between 1 and 200),
  amount_php numeric(14,2) not null check (amount_php >= 0),
  spent_on date not null default current_date,
  budget_id uuid references public.budgets(id) on delete set null,
  incident_id uuid references public.incident_records(id) on delete set null,
  kit_id uuid references public.kits(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.expenses (user_id, spent_on desc);

alter table public.savings_goals enable row level security;
alter table public.savings_contributions enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_lines enable row level security;
alter table public.expenses enable row level security;
create policy sg_own on public.savings_goals for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy sc_own on public.savings_contributions for all using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.savings_goals g where g.id = goal_id and g.user_id = auth.uid()));
create policy b_own on public.budgets for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy bl_own on public.budget_lines for all using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.budgets b where b.id = budget_id and b.user_id = auth.uid()));
create policy e_own on public.expenses for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- AI assistant conversations
-- ---------------------------------------------------------------------------
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New conversation' check (char_length(title) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.ai_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 20000),
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.ai_messages (conversation_id, id);
create index on public.ai_messages (user_id, created_at desc);
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
create policy aic_own on public.ai_conversations for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy aim_own on public.ai_messages for all using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Administration: aggregate-only metrics and audited management functions
-- ---------------------------------------------------------------------------
create or replace function public.admin_metrics() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  select jsonb_build_object(
    'users_total', (select count(*) from public.profiles),
    'users_new_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'users_new_30d', (select count(*) from public.profiles where created_at > now() - interval '30 days'),
    'households', (select count(*) from public.households),
    'plans_total', (select count(*) from public.emergency_plans),
    'plans_active', (select count(*) from public.emergency_plans where status = 'active'),
    'kits_total', (select count(*) from public.kits where not archived),
    'kit_items_ready_pct', (select coalesce(round(100.0 * avg(least(qty_have / nullif(qty_needed, 0), 1))), 0) from public.kit_items where essential and qty_needed > 0),
    'assessments_total', (select count(*) from public.risk_assessments),
    'assessment_avg_score', (select coalesce(round(avg(score)), 0) from (select distinct on (user_id) score from public.risk_assessments
        where user_id in (select id from public.profiles where coalesce((privacy ->> 'allow_aggregate_metrics')::boolean, true))
        order by user_id, created_at desc) s),
    'drills_30d', (select count(*) from public.drill_runs where completed_at > now() - interval '30 days'),
    'groups', (select count(*) from public.groups),
    'organizations', (select count(*) from public.organizations),
    'resources_published', (select count(*) from public.resources where published),
    'resources_review_overdue', (select count(*) from public.resources where review_due_on < current_date),
    'services_listed', (select count(*) from public.services where published),
    'open_reports', (select count(*) from public.content_reports where status = 'open'),
    'ai_messages_7d', (select count(*) from public.ai_messages where created_at > now() - interval '7 days' and role = 'user'),
    'errors_7d', (select count(*) from public.error_events where created_at > now() - interval '7 days'),
    'signups_by_day', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'count', c) order by d), '[]'::jsonb) from (
        select date_trunc('day', created_at)::date d, count(*) c from public.profiles
        where created_at > now() - interval '30 days' group by 1) x)
  ) into result;
  return result;
end $$;

create or replace function public.admin_list_users(p_search text default null, p_limit int default 50, p_offset int default 0)
returns table (id uuid, email text, full_name text, platform_role text, disabled boolean, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  return query
    select p.id, u.email::text, p.full_name, p.platform_role, p.disabled, p.created_at, u.last_sign_in_at
    from public.profiles p join auth.users u on u.id = p.id
    where p_search is null or p_search = '' or u.email ilike '%' || p_search || '%' or p.full_name ilike '%' || p_search || '%'
    order by p.created_at desc limit least(p_limit, 200) offset greatest(p_offset, 0);
end $$;

create or replace function public.admin_set_user(p_user uuid, p_role text, p_disabled boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  if p_user = auth.uid() then raise exception 'Administrators cannot change their own role or status'; end if;
  if p_role not in ('user', 'platform_admin') then raise exception 'Invalid role'; end if;
  update public.profiles set platform_role = p_role, disabled = p_disabled where id = p_user;
  perform public.write_audit('admin.set_user', 'profile', p_user::text,
    jsonb_build_object('platform_role', p_role, 'disabled', p_disabled));
end $$;

create or replace function public.admin_list_orgs()
returns table (id uuid, name text, org_type text, status text, city text, members bigint, drills_completed bigint, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  return query
    select o.id, o.name, o.org_type, o.status, o.city,
      (select count(*) from public.org_members m where m.org_id = o.id),
      (select count(*) from public.org_drills d where d.org_id = o.id and d.completed_on is not null),
      o.created_at
    from public.organizations o order by o.created_at desc;
end $$;

create or replace function public.admin_set_org_status(p_org uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  update public.organizations set status = p_status where id = p_org;
  perform public.write_audit('admin.set_org_status', 'organization', p_org::text, jsonb_build_object('status', p_status));
end $$;

create or replace function public.admin_list_groups()
returns table (id uuid, name text, area text, status text, members bigint, open_reports bigint, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  return query
    select g.id, g.name, g.area, g.status,
      (select count(*) from public.group_members m where m.group_id = g.id),
      (select count(*) from public.content_reports r where r.group_id = g.id and r.status = 'open'),
      g.created_at
    from public.groups g order by g.created_at desc;
end $$;

create or replace function public.admin_set_group_status(p_group uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  update public.groups set status = p_status where id = p_group;
  perform public.write_audit('admin.set_group_status', 'group', p_group::text, jsonb_build_object('status', p_status));
end $$;

create or replace function public.admin_resolve_report(p_report uuid, p_action text) returns void
language plpgsql security definer set search_path = public as $$
declare r public.content_reports;
begin
  select * into r from public.content_reports where id = p_report;
  if not found then raise exception 'Report not found'; end if;
  if not (public.is_platform_admin() or public.is_group_coordinator(r.group_id)) then raise exception 'Not authorized'; end if;
  if p_action = 'hide' then
    if r.target_type = 'post' then update public.group_posts set hidden = true, hidden_reason = 'Moderated' where id = r.target_id;
    else update public.group_comments set hidden = true where id = r.target_id; end if;
    update public.content_reports set status = 'actioned', resolved_by = auth.uid(), resolved_at = now() where id = p_report;
  elsif p_action = 'dismiss' then
    update public.content_reports set status = 'dismissed', resolved_by = auth.uid(), resolved_at = now() where id = p_report;
  else raise exception 'Invalid action'; end if;
  perform public.write_audit('moderation.' || p_action, r.target_type, r.target_id::text, jsonb_build_object('report', p_report));
end $$;

-- Reported content (only the reported item, never the rest of the group).
create or replace function public.admin_reported_content()
returns table (report_id uuid, group_name text, target_type text, target_id uuid, reason text, status text, content text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  return query
    select r.id, g.name, r.target_type, r.target_id, r.reason, r.status,
      case when r.target_type = 'post' then (select p.title || E'\n' || p.body from public.group_posts p where p.id = r.target_id)
           else (select c.body from public.group_comments c where c.id = r.target_id) end,
      r.created_at
    from public.content_reports r join public.groups g on g.id = r.group_id
    order by (r.status = 'open') desc, r.created_at desc limit 200;
end $$;

-- Lock down function execution to signed-in users where appropriate.
revoke execute on function public.admin_metrics() from public, anon;
revoke execute on function public.admin_list_users(text, int, int) from public, anon;
revoke execute on function public.admin_set_user(uuid, text, boolean) from public, anon;
revoke execute on function public.admin_list_orgs() from public, anon;
revoke execute on function public.admin_set_org_status(uuid, text) from public, anon;
revoke execute on function public.admin_list_groups() from public, anon;
revoke execute on function public.admin_set_group_status(uuid, text) from public, anon;
revoke execute on function public.admin_resolve_report(uuid, text) from public, anon;
revoke execute on function public.admin_reported_content() from public, anon;
revoke execute on function public.accept_household_invite(text) from public, anon;
revoke execute on function public.accept_group_invite(text) from public, anon;
revoke execute on function public.accept_org_invite(text) from public, anon;
grant execute on function public.admin_metrics(), public.admin_list_users(text, int, int), public.admin_set_user(uuid, text, boolean),
  public.admin_list_orgs(), public.admin_set_org_status(uuid, text), public.admin_list_groups(), public.admin_set_group_status(uuid, text),
  public.admin_resolve_report(uuid, text), public.admin_reported_content(),
  public.accept_household_invite(text), public.accept_group_invite(text), public.accept_org_invite(text) to authenticated;

-- Table privileges (Supabase grants these by default; explicit for clarity/portability).
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.resources, public.services, public.app_settings to anon;
grant insert on public.error_events to anon;
grant usage, select on all sequences in schema public to anon, authenticated;
