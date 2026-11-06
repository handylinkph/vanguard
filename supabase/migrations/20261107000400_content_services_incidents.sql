-- Resource library (Feature 7), Services directory (Feature 10), Incident records (Feature 14)

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,100}$'),
  title text not null check (char_length(title) between 3 and 200),
  summary text not null check (char_length(summary) <= 500),
  body text not null default '' check (char_length(body) <= 50000),
  category text not null check (category in ('guide', 'procedure', 'checklist', 'household', 'health', 'finance', 'business', 'school', 'community')),
  hazards text[] not null default '{}',
  language text not null default 'en' check (language in ('en', 'fil', 'ceb', 'hil')),
  download_url text check (download_url ~ '^https://'),
  source_name text not null check (char_length(source_name) <= 200),
  source_url text check (source_url ~ '^https://'),
  reviewed_on date not null,
  review_due_on date,
  published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger resources_updated before update on public.resources for each row execute function public.set_updated_at();
alter table public.resources enable row level security;
create policy resources_public_read on public.resources for select using (published or public.is_platform_admin());
create policy resources_admin_write on public.resources for all using (public.is_platform_admin()) with check (public.is_platform_admin());

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 200),
  category text not null check (category in ('hotline', 'hospital', 'clinic', 'fire', 'police', 'evacuation', 'drrmo', 'other')),
  phone text check (char_length(phone) <= 60),
  alt_phone text check (char_length(alt_phone) <= 60),
  address text check (char_length(address) <= 300),
  region text, city text,
  scope text not null default 'local' check (scope in ('national', 'regional', 'local')),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  source_name text not null check (char_length(source_name) <= 200),
  source_url text check (source_url ~ '^https://'),
  verification text not null default 'unverified' check (verification in ('verified', 'unverified')),
  last_reviewed_on date not null,
  notes text check (char_length(notes) <= 500),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger services_updated before update on public.services for each row execute function public.set_updated_at();
alter table public.services enable row level security;
create policy services_public_read on public.services for select using (published or public.is_platform_admin());
create policy services_admin_write on public.services for all using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Audit CMS changes automatically.
create or replace function public.audit_content_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), lower(tg_op), tg_table_name,
          coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id', to_jsonb(new) ->> 'key', to_jsonb(old) ->> 'key'),
          jsonb_build_object('title', coalesce(to_jsonb(new) ->> 'title', to_jsonb(new) ->> 'name', to_jsonb(old) ->> 'title', to_jsonb(old) ->> 'name'),
                             'value', case when tg_table_name = 'app_settings' then to_jsonb(new) -> 'value' end));
  return coalesce(new, old);
end $$;
create trigger resources_audit after insert or update or delete on public.resources for each row execute function public.audit_content_change();
create trigger services_audit after insert or update or delete on public.services for each row execute function public.audit_content_change();

-- ---------------------------------------------------------------------------
-- Personal incident records — strictly private to the owner.
-- No policy grants administrators or household members access.
-- ---------------------------------------------------------------------------
create table public.incident_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('typhoon', 'flood', 'earthquake', 'volcano', 'landslide', 'fire', 'tsunami', 'power_outage', 'medical', 'other')),
  title text not null check (char_length(title) between 1 and 200),
  occurred_on date not null,
  ended_on date,
  location_text text check (char_length(location_text) <= 300),
  description text check (char_length(description) <= 10000),
  damage_description text check (char_length(damage_description) <= 5000),
  estimated_damage_php numeric(14,2) check (estimated_damage_php >= 0),
  recovery_tasks jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.incident_records (user_id, occurred_on desc);
create trigger incidents_updated before update on public.incident_records for each row execute function public.set_updated_at();
alter table public.incident_records enable row level security;
create policy incidents_owner on public.incident_records for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.incident_attachments (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incident_records(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null check (char_length(file_name) <= 200),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  size_bytes int not null check (size_bytes between 1 and 10485760),
  created_at timestamptz not null default now()
);
alter table public.incident_attachments enable row level security;
create policy ia_owner on public.incident_attachments for all using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.incident_records r where r.id = incident_id and r.user_id = auth.uid()));

-- Private storage bucket; object paths are "<user_id>/<incident_id>/<file>".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('incident-files', 'incident-files', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "incident files owner read" on storage.objects for select
  using (bucket_id = 'incident-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "incident files owner insert" on storage.objects for insert
  with check (bucket_id = 'incident-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "incident files owner delete" on storage.objects for delete
  using (bucket_id = 'incident-files' and (storage.foldername(name))[1] = auth.uid()::text);
