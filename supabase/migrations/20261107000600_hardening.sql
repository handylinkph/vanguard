-- Integrity safeguards discovered during implementation review.

-- A household must keep at least one administrator while it has other account members.
create or replace function public.keep_household_admin() returns trigger
language plpgsql security definer set search_path = public as $$
declare remaining_admins int; remaining_members int;
begin
  if (tg_op = 'DELETE' and old.role = 'admin') or (tg_op = 'UPDATE' and old.role = 'admin' and new.role <> 'admin') then
    -- Skip during cascades (household itself being deleted, or the user account being deleted).
    if not exists (select 1 from public.households where id = old.household_id) then return coalesce(new, old); end if;
    if old.user_id is not null and not exists (select 1 from public.profiles where id = old.user_id) then return coalesce(new, old); end if;
    select count(*) filter (where role = 'admin' and id <> old.id), count(*) filter (where user_id is not null and id <> old.id)
      into remaining_admins, remaining_members from public.household_members where household_id = old.household_id;
    if remaining_admins = 0 and remaining_members > 0 then
      raise exception 'Make another member an administrator before leaving or stepping down';
    end if;
  end if;
  return coalesce(new, old);
end $$;
create trigger hm_keep_admin before delete or update on public.household_members
  for each row execute function public.keep_household_admin();

-- Clean up an empty household when its last account member leaves.
create or replace function public.cleanup_empty_household() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.user_id is not null and not exists (select 1 from public.household_members where household_id = old.household_id and user_id is not null) then
    delete from public.households where id = old.household_id;
  end if;
  return old;
end $$;
create trigger hm_cleanup after delete on public.household_members
  for each row execute function public.cleanup_empty_household();

-- Per-user data export helper: bundles every row the caller owns (RLS still applies).
create or replace function public.my_data_export() returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'profile', (select to_jsonb(p) from public.profiles p where id = auth.uid()),
    'households', (select coalesce(jsonb_agg(h), '[]') from public.households h),
    'household_members', (select coalesce(jsonb_agg(m), '[]') from public.household_members m),
    'household_pets', (select coalesce(jsonb_agg(x), '[]') from public.household_pets x),
    'emergency_contacts', (select coalesce(jsonb_agg(c), '[]') from public.emergency_contacts c where owner_id = auth.uid()),
    'emergency_plans', (select coalesce(jsonb_agg(p), '[]') from public.emergency_plans p where owner_id = auth.uid()),
    'plan_checklist_items', (select coalesce(jsonb_agg(i), '[]') from public.plan_checklist_items i join public.emergency_plans p on p.id = i.plan_id where p.owner_id = auth.uid()),
    'risk_assessments', (select coalesce(jsonb_agg(r), '[]') from public.risk_assessments r where user_id = auth.uid()),
    'kits', (select coalesce(jsonb_agg(k), '[]') from public.kits k where owner_id = auth.uid()),
    'kit_items', (select coalesce(jsonb_agg(i), '[]') from public.kit_items i join public.kits k on k.id = i.kit_id where k.owner_id = auth.uid()),
    'drill_runs', (select coalesce(jsonb_agg(d), '[]') from public.drill_runs d where user_id = auth.uid()),
    'drill_schedules', (select coalesce(jsonb_agg(d), '[]') from public.drill_schedules d where user_id = auth.uid()),
    'incident_records', (select coalesce(jsonb_agg(i), '[]') from public.incident_records i where user_id = auth.uid()),
    'incident_attachments', (select coalesce(jsonb_agg(a), '[]') from public.incident_attachments a where user_id = auth.uid()),
    'savings_goals', (select coalesce(jsonb_agg(x), '[]') from public.savings_goals x where user_id = auth.uid()),
    'savings_contributions', (select coalesce(jsonb_agg(x), '[]') from public.savings_contributions x where user_id = auth.uid()),
    'budgets', (select coalesce(jsonb_agg(x), '[]') from public.budgets x where user_id = auth.uid()),
    'budget_lines', (select coalesce(jsonb_agg(x), '[]') from public.budget_lines x where user_id = auth.uid()),
    'expenses', (select coalesce(jsonb_agg(x), '[]') from public.expenses x where user_id = auth.uid()),
    'group_memberships', (select coalesce(jsonb_agg(x), '[]') from public.group_members x where user_id = auth.uid()),
    'group_posts', (select coalesce(jsonb_agg(x), '[]') from public.group_posts x where author_id = auth.uid()),
    'group_comments', (select coalesce(jsonb_agg(x), '[]') from public.group_comments x where author_id = auth.uid()),
    'org_memberships', (select coalesce(jsonb_agg(x), '[]') from public.org_members x where user_id = auth.uid()),
    'ai_conversations', (select coalesce(jsonb_agg(x), '[]') from public.ai_conversations x where user_id = auth.uid()),
    'ai_messages', (select coalesce(jsonb_agg(x), '[]') from public.ai_messages x where user_id = auth.uid()),
    'reminders', (select coalesce(jsonb_agg(x), '[]') from public.reminders x where user_id = auth.uid()),
    'saved_items', (select coalesce(jsonb_agg(x), '[]') from public.saved_items x where user_id = auth.uid()),
    'checklist_progress', (select coalesce(jsonb_agg(x), '[]') from public.checklist_progress x where user_id = auth.uid()),
    'activity_log', (select coalesce(jsonb_agg(x), '[]') from public.activity_log x where user_id = auth.uid()),
    'exported_at', now()
  )
$$;
revoke execute on function public.my_data_export() from public, anon;
grant execute on function public.my_data_export() to authenticated;

-- Audit configuration changes.
create trigger settings_audit after update on public.app_settings
  for each row execute function public.audit_content_change();
