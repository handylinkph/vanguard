-- Community & group collaboration (Feature 6). No rescue/dispatch features.

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  description text check (char_length(description) <= 2000),
  area text check (char_length(area) <= 120),
  created_by uuid references public.profiles(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger groups_updated before update on public.groups for each row execute function public.set_updated_at();

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'coordinator', 'member')),
  display_name text not null default 'Member' check (char_length(display_name) <= 120),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index on public.group_members (user_id);

create or replace function public.group_role(gid uuid) returns text
language sql stable security definer set search_path = public as $$
  select role from public.group_members where group_id = gid and user_id = auth.uid()
$$;
create or replace function public.is_group_member(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.group_role(gid) is not null
$$;
create or replace function public.is_group_coordinator(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.group_role(gid) in ('owner', 'coordinator'), false)
$$;

create or replace function public.group_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.group_members (group_id, user_id, role, display_name)
  values (new.id, new.created_by, 'owner',
          coalesce(nullif((select full_name from public.profiles where id = new.created_by), ''), 'Organizer'));
  return new;
end $$;
create trigger groups_add_owner after insert on public.groups for each row execute function public.group_after_insert();

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
create policy groups_select on public.groups for select using (public.is_group_member(id) or public.is_platform_admin());
create policy groups_insert on public.groups for insert with check (created_by = auth.uid());
create policy groups_update on public.groups for update using (public.is_group_coordinator(id));
create policy groups_delete on public.groups for delete using (public.group_role(id) = 'owner');

create policy gm_select on public.group_members for select using (public.is_group_member(group_id));
create policy gm_update on public.group_members for update using (public.is_group_coordinator(group_id));
create policy gm_delete on public.group_members for delete
  using (user_id = auth.uid() or public.is_group_coordinator(group_id));

create or replace function public.protect_group_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'owner' and old.role <> 'owner' then
    raise exception 'Ownership cannot be assigned this way';
  end if;
  if old.role = 'owner' and new.role <> 'owner' then
    raise exception 'The group owner role cannot be removed';
  end if;
  return new;
end $$;
create trigger gm_protect before update on public.group_members for each row execute function public.protect_group_member();

create table public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  token text not null unique default public.new_token(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  max_uses int not null default 25 check (max_uses between 1 and 500),
  uses int not null default 0,
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now()
);
alter table public.group_invites enable row level security;
create policy ginv_select on public.group_invites for select using (public.is_group_coordinator(group_id));
create policy ginv_insert on public.group_invites for insert
  with check (public.is_group_coordinator(group_id) and created_by = auth.uid());
create policy ginv_delete on public.group_invites for delete using (public.is_group_coordinator(group_id));

create or replace function public.preview_group_invite(p_token text)
returns table (group_name text, area text, valid boolean)
language sql stable security definer set search_path = public as $$
  select g.name, g.area, (i.uses < i.max_uses and i.expires_at > now() and g.status = 'active')
  from public.group_invites i join public.groups g on g.id = i.group_id where i.token = p_token
$$;

create or replace function public.accept_group_invite(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv public.group_invites; uname text; share boolean;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into inv from public.group_invites where token = p_token for update;
  if not found then raise exception 'Invitation not found'; end if;
  if inv.uses >= inv.max_uses or inv.expires_at < now() then raise exception 'Invitation is no longer valid'; end if;
  if exists (select 1 from public.groups where id = inv.group_id and status <> 'active') then
    raise exception 'This group is not accepting members';
  end if;
  select coalesce((privacy ->> 'share_name_with_groups')::boolean, true), full_name
    into share, uname from public.profiles where id = auth.uid();
  insert into public.group_members (group_id, user_id, role, display_name)
  values (inv.group_id, auth.uid(), 'member',
          case when share and coalesce(uname, '') <> '' then uname else 'Member' end)
  on conflict do nothing;
  if found then update public.group_invites set uses = uses + 1 where id = inv.id; end if;
  return inv.group_id;
end $$;

-- Posts: announcements (coordinators) and discussions (members).
create table public.group_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('announcement', 'discussion')),
  title text not null check (char_length(title) between 1 and 200),
  body text not null check (char_length(body) between 1 and 5000),
  hidden boolean not null default false,
  hidden_reason text,
  created_at timestamptz not null default now()
);
create index on public.group_posts (group_id, created_at desc);

create table public.group_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.group_posts(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.group_comments (post_id);

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 3 and 500),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.content_reports (status, created_at desc);

create or replace function public.is_reported(p_type text, p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.content_reports where target_type = p_type and target_id = p_id)
$$;

alter table public.group_posts enable row level security;
alter table public.group_comments enable row level security;
alter table public.content_reports enable row level security;

create policy gp_select on public.group_posts for select using (
  (public.is_group_member(group_id) and (not hidden or author_id = auth.uid() or public.is_group_coordinator(group_id)))
  or (public.is_platform_admin() and public.is_reported('post', id)));
create policy gp_insert on public.group_posts for insert with check (
  author_id = auth.uid() and public.is_group_member(group_id) and
  (kind = 'discussion' or public.is_group_coordinator(group_id)));
create policy gp_update on public.group_posts for update using (
  author_id = auth.uid() or public.is_group_coordinator(group_id)
  or (public.is_platform_admin() and public.is_reported('post', id)));
create policy gp_delete on public.group_posts for delete using (author_id = auth.uid() or public.is_group_coordinator(group_id));

create policy gc_select on public.group_comments for select using (
  (public.is_group_member(group_id) and (not hidden or author_id = auth.uid() or public.is_group_coordinator(group_id)))
  or (public.is_platform_admin() and public.is_reported('comment', id)));
create policy gc_insert on public.group_comments for insert with check (
  author_id = auth.uid() and public.is_group_member(group_id)
  and exists (select 1 from public.group_posts p where p.id = post_id and p.group_id = group_comments.group_id));
create policy gc_update on public.group_comments for update using (
  author_id = auth.uid() or public.is_group_coordinator(group_id)
  or (public.is_platform_admin() and public.is_reported('comment', id)));
create policy gc_delete on public.group_comments for delete using (author_id = auth.uid() or public.is_group_coordinator(group_id));

create policy cr_insert on public.content_reports for insert with check (reporter_id = auth.uid() and public.is_group_member(group_id));
create policy cr_select on public.content_reports for select using (
  reporter_id = auth.uid() or public.is_group_coordinator(group_id) or public.is_platform_admin());
create policy cr_update on public.content_reports for update using (public.is_group_coordinator(group_id) or public.is_platform_admin());

-- Tasks, shared checklist, events
create table public.group_tasks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 1000),
  assigned_to uuid references public.profiles(id) on delete set null,
  due_on date,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger gt_updated before update on public.group_tasks for each row execute function public.set_updated_at();

create table public.group_checklist_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 200),
  done boolean not null default false,
  done_by uuid references public.profiles(id) on delete set null,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table public.group_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 2000),
  kind text not null default 'activity' check (kind in ('drill', 'meeting', 'training', 'activity')),
  starts_at timestamptz not null,
  location_text text check (char_length(location_text) <= 200),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.group_tasks enable row level security;
alter table public.group_checklist_items enable row level security;
alter table public.group_events enable row level security;

create policy gt_select on public.group_tasks for select using (public.is_group_member(group_id));
create policy gt_insert on public.group_tasks for insert with check (public.is_group_coordinator(group_id) and created_by = auth.uid());
create policy gt_update on public.group_tasks for update using (public.is_group_coordinator(group_id) or assigned_to = auth.uid());
create policy gt_delete on public.group_tasks for delete using (public.is_group_coordinator(group_id));

create policy gcl_select on public.group_checklist_items for select using (public.is_group_member(group_id));
create policy gcl_insert on public.group_checklist_items for insert with check (public.is_group_coordinator(group_id));
create policy gcl_update on public.group_checklist_items for update using (public.is_group_member(group_id));
create policy gcl_delete on public.group_checklist_items for delete using (public.is_group_coordinator(group_id));

create policy ge_select on public.group_events for select using (public.is_group_member(group_id));
create policy ge_write on public.group_events for all using (public.is_group_coordinator(group_id))
  with check (public.is_group_coordinator(group_id));
