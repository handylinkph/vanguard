-- Vanguard core: profiles, households, contacts, activity, audit, settings, errors.
-- Target: Supabase (PostgreSQL 15+). All tables use row-level security.

-- ---------------------------------------------------------------------------
-- Utility
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function public.new_token() returns text
language sql volatile as $$
  select replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
$$;

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  phone text check (char_length(phone) <= 40),
  region text check (char_length(region) <= 80),
  city text check (char_length(city) <= 80),
  barangay text check (char_length(barangay) <= 80),
  platform_role text not null default 'user' check (platform_role in ('user', 'platform_admin')),
  disabled boolean not null default false,
  onboarded boolean not null default false,
  privacy jsonb not null default '{"share_name_with_groups": true, "allow_aggregate_metrics": true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Users must not be able to promote themselves.
create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_platform_admin() and old.id <> auth.uid() then
    return new;  -- admins may change other users (never themselves)
  end if;
  if auth.uid() is not null and (
     new.platform_role is distinct from old.platform_role or
     new.disabled is distinct from old.disabled) then
    raise exception 'platform_role and disabled can only be changed by an administrator';
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_fields();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and platform_role = 'platform_admin' and not disabled)
$$;

alter table public.profiles enable row level security;
create policy profiles_select_own on public.profiles for select using (id = auth.uid());
create policy profiles_update_own on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- Households
-- ---------------------------------------------------------------------------
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  region text, city text, barangay text,
  dwelling_type text check (dwelling_type in ('house', 'apartment', 'condominium', 'boarding', 'other')),
  floors int check (floors between 0 and 200),
  near_coast boolean, near_river boolean, near_slope boolean,
  notes text check (char_length(notes) <= 2000),
  -- set null (not cascade) so shared households survive their creator's account deletion
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger households_updated before update on public.households
  for each row execute function public.set_updated_at();

-- Members: account-linked (user_id set) or dependents without an account.
create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member', 'dependent')),
  display_name text not null check (char_length(display_name) between 1 and 120),
  relationship text check (char_length(relationship) <= 60),
  age_group text not null default 'adult' check (age_group in ('infant', 'child', 'teen', 'adult', 'senior')),
  needs_assistance boolean not null default false,
  -- Free-text care notes are optional and visible only to household members.
  care_notes text check (char_length(care_notes) <= 500),
  responsibilities text check (char_length(responsibilities) <= 500),
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);
create index on public.household_members (user_id);
create index on public.household_members (household_id);

create table public.household_pets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) <= 60),
  species text check (char_length(species) <= 40),
  notes text check (char_length(notes) <= 300)
);

create or replace function public.is_household_member(hid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.household_members
                 where household_id = hid and user_id = auth.uid() and role in ('admin', 'member'))
$$;
create or replace function public.is_household_admin(hid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.household_members
                 where household_id = hid and user_id = auth.uid() and role = 'admin')
$$;

create or replace function public.household_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.household_members (household_id, user_id, role, display_name, relationship)
  values (new.id, new.created_by, 'admin',
          coalesce(nullif((select full_name from public.profiles where id = new.created_by), ''), 'Me'),
          'self');
  return new;
end $$;
create trigger households_add_creator after insert on public.households
  for each row execute function public.household_after_insert();

create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  token text not null unique default public.new_token(),
  role text not null default 'member' check (role in ('admin', 'member')),
  note text check (char_length(note) <= 200),
  created_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_pets enable row level security;
alter table public.household_invites enable row level security;

create policy households_select on public.households for select using (public.is_household_member(id));
create policy households_insert on public.households for insert with check (created_by = auth.uid());
create policy households_update on public.households for update using (public.is_household_admin(id));
create policy households_delete on public.households for delete using (public.is_household_admin(id));

create policy hm_select on public.household_members for select using (public.is_household_member(household_id));
create policy hm_insert on public.household_members for insert
  with check (public.is_household_admin(household_id) and (user_id is null) and role = 'dependent');
create policy hm_update on public.household_members for update
  using (public.is_household_admin(household_id) or user_id = auth.uid())
  with check (public.is_household_admin(household_id) or (user_id = auth.uid()));
create policy hm_delete on public.household_members for delete
  using (public.is_household_admin(household_id) or user_id = auth.uid());

-- Members may not change their own role unless they are an admin.
create or replace function public.protect_member_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_household_admin(old.household_id) then
    raise exception 'Only household administrators can change roles';
  end if;
  if new.user_id is distinct from old.user_id or new.household_id is distinct from old.household_id then
    raise exception 'Membership identity cannot be changed';
  end if;
  return new;
end $$;
create trigger hm_protect before update on public.household_members
  for each row execute function public.protect_member_role();

create policy pets_select on public.household_pets for select using (public.is_household_member(household_id));
create policy pets_write on public.household_pets for all
  using (public.is_household_admin(household_id)) with check (public.is_household_admin(household_id));

create policy hinv_select on public.household_invites for select using (public.is_household_admin(household_id));
create policy hinv_insert on public.household_invites for insert
  with check (public.is_household_admin(household_id) and created_by = auth.uid());
create policy hinv_delete on public.household_invites for delete using (public.is_household_admin(household_id));

create or replace function public.preview_household_invite(p_token text)
returns table (household_name text, role text, expires_at timestamptz, valid boolean)
language sql stable security definer set search_path = public as $$
  select h.name, i.role, i.expires_at, (i.accepted_at is null and i.expires_at > now())
  from public.household_invites i join public.households h on h.id = i.household_id
  where i.token = p_token
$$;

create or replace function public.accept_household_invite(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv public.household_invites; uname text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into inv from public.household_invites where token = p_token for update;
  if not found then raise exception 'Invitation not found'; end if;
  if inv.accepted_at is not null then raise exception 'Invitation already used'; end if;
  if inv.expires_at < now() then raise exception 'Invitation expired'; end if;
  select coalesce(nullif(full_name, ''), 'Member') into uname from public.profiles where id = auth.uid();
  insert into public.household_members (household_id, user_id, role, display_name)
  values (inv.household_id, auth.uid(), inv.role, uname)
  on conflict (household_id, user_id) do nothing;
  update public.household_invites set accepted_by = auth.uid(), accepted_at = now() where id = inv.id;
  return inv.household_id;
end $$;

-- ---------------------------------------------------------------------------
-- Emergency contacts (personal or household-shared)
-- ---------------------------------------------------------------------------
create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  relationship text check (char_length(relationship) <= 60),
  phone text not null check (char_length(phone) between 3 and 40),
  alt_phone text check (char_length(alt_phone) <= 40),
  email text check (char_length(email) <= 200),
  is_out_of_area boolean not null default false,
  priority int not null default 100,
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.emergency_contacts (owner_id);
create index on public.emergency_contacts (household_id);
create trigger contacts_updated before update on public.emergency_contacts
  for each row execute function public.set_updated_at();
alter table public.emergency_contacts enable row level security;
create policy contacts_select on public.emergency_contacts for select
  using (owner_id = auth.uid() or (household_id is not null and public.is_household_member(household_id)));
create policy contacts_insert on public.emergency_contacts for insert
  with check (owner_id = auth.uid() and (household_id is null or public.is_household_member(household_id)));
create policy contacts_update on public.emergency_contacts for update
  using (owner_id = auth.uid() or (household_id is not null and public.is_household_admin(household_id)));
create policy contacts_delete on public.emergency_contacts for delete
  using (owner_id = auth.uid() or (household_id is not null and public.is_household_admin(household_id)));

-- ---------------------------------------------------------------------------
-- Activity log (preparedness history shown on dashboards)
-- ---------------------------------------------------------------------------
create table public.activity_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  kind text not null check (char_length(kind) <= 40),
  summary text not null check (char_length(summary) <= 300),
  link text check (char_length(link) <= 300),
  created_at timestamptz not null default now()
);
create index on public.activity_log (user_id, created_at desc);
create index on public.activity_log (household_id, created_at desc);
alter table public.activity_log enable row level security;
create policy activity_select on public.activity_log for select
  using (user_id = auth.uid() or (household_id is not null and public.is_household_member(household_id)));
create policy activity_insert on public.activity_log for insert
  with check (user_id = auth.uid() and (household_id is null or public.is_household_member(household_id)));
create policy activity_delete on public.activity_log for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Reminders (in-app; no push service)
-- ---------------------------------------------------------------------------
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  due_on date not null,
  related_type text check (related_type in ('plan', 'kit', 'kit_item', 'drill', 'finance', 'general', 'assessment')),
  related_id uuid,
  link text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.reminders (user_id, done, due_on);
alter table public.reminders enable row level security;
create policy reminders_own on public.reminders for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Saved items & generic checklist progress
-- ---------------------------------------------------------------------------
create table public.saved_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null check (item_type in ('guide', 'resource', 'service')),
  item_key text not null check (char_length(item_key) <= 200),
  title text check (char_length(title) <= 200),
  created_at timestamptz not null default now(),
  primary key (user_id, item_type, item_key)
);
alter table public.saved_items enable row level security;
create policy saved_own on public.saved_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.checklist_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  checklist_key text not null check (char_length(checklist_key) <= 100),
  item_key text not null check (char_length(item_key) <= 100),
  done boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, checklist_key, item_key)
);
alter table public.checklist_progress enable row level security;
create policy checklist_own on public.checklist_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Audit logs, error events, settings
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_logs (created_at desc);
alter table public.audit_logs enable row level security;
create policy audit_admin_select on public.audit_logs for select using (public.is_platform_admin());

create or replace function public.write_audit(p_action text, p_target_type text, p_target_id text, p_details jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.audit_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), p_action, p_target_type, p_target_id, coalesce(p_details, '{}'::jsonb))
$$;
revoke execute on function public.write_audit(text, text, text, jsonb) from public, anon, authenticated;

create table public.error_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  source text not null default 'client' check (source in ('client', 'server')),
  message text not null check (char_length(message) <= 1000),
  path text check (char_length(path) <= 300),
  detail text check (char_length(detail) <= 4000),
  created_at timestamptz not null default now()
);
create index on public.error_events (created_at desc);
alter table public.error_events enable row level security;
create policy errors_insert on public.error_events for insert
  with check (user_id is null or user_id = auth.uid());
create policy errors_admin_select on public.error_events for select using (public.is_platform_admin());

create table public.app_settings (
  key text primary key check (char_length(key) <= 80),
  value jsonb not null,
  description text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
create policy settings_read on public.app_settings for select using (true);
create policy settings_admin_write on public.app_settings for all
  using (public.is_platform_admin()) with check (public.is_platform_admin());

insert into public.app_settings (key, value, description) values
  ('ai_assistant_enabled', 'true', 'Allow signed-in users to use the AI preparedness assistant (requires server API key).'),
  ('ai_hourly_message_limit', '30', 'Maximum AI messages per user per hour.'),
  ('community_posting_enabled', 'true', 'Allow discussion posts in community groups.'),
  ('maintenance_banner', '""', 'Optional banner text shown to all signed-in users.');
