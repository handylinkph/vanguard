-- Plans (Feature 1), Risk assessment (Feature 4), Kits (Feature 5), Drills (Feature 8)

-- ---------------------------------------------------------------------------
-- Emergency plans
-- ---------------------------------------------------------------------------
create table public.emergency_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid references public.households(id) on delete set null,
  plan_type text not null default 'personal' check (plan_type in ('personal', 'household')),
  hazard text not null default 'all' check (hazard in ('all', 'typhoon', 'flood', 'earthquake', 'volcano', 'landslide', 'fire', 'tsunami')),
  title text not null check (char_length(title) between 1 and 160),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  shared_with_household boolean not null default false,
  -- Structured sections: meeting_places[], evacuation_destinations[],
  -- responsibilities[], communication{}, notes. Validated in the app (zod).
  sections jsonb not null default '{}'::jsonb,
  current_step int not null default 0,
  review_on date,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.emergency_plans (owner_id);
create index on public.emergency_plans (household_id);

create or replace function public.bump_version() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  new.version = coalesce(old.version, 0) + 1;
  return new;
end $$;
create trigger plans_version before update on public.emergency_plans
  for each row execute function public.bump_version();

create or replace function public.can_view_plan(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.emergency_plans p where p.id = pid and (
    p.owner_id = auth.uid() or
    (p.shared_with_household and p.household_id is not null and public.is_household_member(p.household_id))))
$$;
create or replace function public.can_edit_plan(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.emergency_plans p where p.id = pid and (
    p.owner_id = auth.uid() or
    (p.shared_with_household and p.household_id is not null and public.is_household_admin(p.household_id))))
$$;

alter table public.emergency_plans enable row level security;
create policy plans_select on public.emergency_plans for select using (public.can_view_plan(id));
create policy plans_insert on public.emergency_plans for insert
  with check (owner_id = auth.uid() and (household_id is null or public.is_household_member(household_id)));
create policy plans_update on public.emergency_plans for update using (public.can_edit_plan(id))
  with check (household_id is null or public.is_household_member(household_id) or owner_id = auth.uid());
create policy plans_delete on public.emergency_plans for delete using (owner_id = auth.uid());

create table public.plan_checklist_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.emergency_plans(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 300),
  phase text not null default 'before' check (phase in ('before', 'during', 'after')),
  done boolean not null default false,
  assigned_to text check (char_length(assigned_to) <= 120),
  due_on date,
  sort int not null default 0,
  updated_at timestamptz not null default now(),
  version int not null default 1
);
create index on public.plan_checklist_items (plan_id);
create trigger pci_version before update on public.plan_checklist_items
  for each row execute function public.bump_version();
alter table public.plan_checklist_items enable row level security;
create policy pci_select on public.plan_checklist_items for select using (public.can_view_plan(plan_id));
-- Household members may tick items on plans shared with them.
create policy pci_update on public.plan_checklist_items for update using (public.can_view_plan(plan_id));
create policy pci_insert on public.plan_checklist_items for insert with check (public.can_edit_plan(plan_id));
create policy pci_delete on public.plan_checklist_items for delete using (public.can_edit_plan(plan_id));

-- ---------------------------------------------------------------------------
-- Risk / preparedness assessments
-- ---------------------------------------------------------------------------
create table public.risk_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid references public.households(id) on delete set null,
  region text, city text,
  hazards text[] not null default '{}',
  answers jsonb not null,
  score int not null check (score between 0 and 100),
  category_scores jsonb not null default '{}'::jsonb,
  vulnerability_factors text[] not null default '{}',
  recommendations jsonb not null default '[]'::jsonb,
  methodology_version text not null default 'v1',
  created_at timestamptz not null default now()
);
create index on public.risk_assessments (user_id, created_at desc);
alter table public.risk_assessments enable row level security;
create policy ra_own on public.risk_assessments for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Emergency kits
-- ---------------------------------------------------------------------------
create table public.kits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid references public.households(id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  kit_type text not null check (kit_type in ('three_day', 'seven_day', 'home', 'go_bag', 'custom')),
  days int not null default 3 check (days between 1 and 30),
  people jsonb not null default '{"adults":1,"children":0,"infants":0,"seniors":0,"pets":0}'::jsonb,
  needs text[] not null default '{}',
  location_note text check (char_length(location_note) <= 200),
  archived boolean not null default false,
  last_checked_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.kits (owner_id);
create index on public.kits (household_id);
create trigger kits_updated before update on public.kits for each row execute function public.set_updated_at();

create or replace function public.can_view_kit(kid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.kits k where k.id = kid and (
    k.owner_id = auth.uid() or (k.household_id is not null and public.is_household_member(k.household_id))))
$$;
alter table public.kits enable row level security;
create policy kits_select on public.kits for select using (public.can_view_kit(id));
create policy kits_insert on public.kits for insert
  with check (owner_id = auth.uid() and (household_id is null or public.is_household_member(household_id)));
create policy kits_update on public.kits for update using (
  owner_id = auth.uid() or (household_id is not null and public.is_household_member(household_id)));
create policy kits_delete on public.kits for delete using (
  owner_id = auth.uid() or (household_id is not null and public.is_household_admin(household_id)));

create table public.kit_items (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references public.kits(id) on delete cascade,
  category text not null check (char_length(category) <= 40),
  name text not null check (char_length(name) between 1 and 160),
  unit text not null default 'pcs' check (char_length(unit) <= 20),
  qty_needed numeric(10,2) not null default 1 check (qty_needed >= 0),
  qty_have numeric(10,2) not null default 0 check (qty_have >= 0),
  packed boolean not null default false,
  essential boolean not null default true,
  expires_on date,
  est_unit_cost_php numeric(12,2) check (est_unit_cost_php >= 0),
  notes text check (char_length(notes) <= 300),
  template_key text,
  updated_at timestamptz not null default now(),
  version int not null default 1
);
create index on public.kit_items (kit_id);
create trigger kit_items_version before update on public.kit_items for each row execute function public.bump_version();
alter table public.kit_items enable row level security;
create policy ki_select on public.kit_items for select using (public.can_view_kit(kit_id));
create policy ki_write on public.kit_items for all using (public.can_view_kit(kit_id)) with check (public.can_view_kit(kit_id));

-- ---------------------------------------------------------------------------
-- Drills & simulations
-- ---------------------------------------------------------------------------
create table public.drill_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid references public.households(id) on delete set null,
  scenario_key text not null check (char_length(scenario_key) <= 60),
  mode text not null check (mode in ('simulation', 'household_drill')),
  score int, max_score int,
  decisions jsonb not null default '[]'::jsonb,
  checklist jsonb not null default '[]'::jsonb,
  duration_seconds int check (duration_seconds >= 0),
  participants int check (participants >= 0),
  reflection text check (char_length(reflection) <= 2000),
  completed_at timestamptz not null default now()
);
create index on public.drill_runs (user_id, completed_at desc);
alter table public.drill_runs enable row level security;
create policy dr_select on public.drill_runs for select
  using (user_id = auth.uid() or (household_id is not null and public.is_household_member(household_id)));
create policy dr_insert on public.drill_runs for insert with check (user_id = auth.uid());
create policy dr_delete on public.drill_runs for delete using (user_id = auth.uid());

create table public.drill_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scenario_key text not null,
  scheduled_for date not null,
  notes text check (char_length(notes) <= 300),
  done boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.drill_schedules enable row level security;
create policy ds_own on public.drill_schedules for all using (user_id = auth.uid()) with check (user_id = auth.uid());
