-- GDPR: export a family's data, delete a family's data, and clean up old data automatically.
--
-- export_family_data() and delete_family_data() only work for an admin (parent) of the family that is active in
-- their session, and only on that family's rows. Deleting the family in Clerk (the organization and the family
-- screen account) happens in api/family-delete.ts.

-- All of the active family's data as one JSON document (for "Download family data").
-- Runs with the caller's own rights, so row-level security limits it to their family as everywhere else.
create or replace function public.export_family_data()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if public.current_family_id() is null or not public.is_family_admin() then
    raise exception 'Only family admins can export family data' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'family_id', public.current_family_id(),
    'exported_at', now(),
    'settings', (select to_jsonb(s) - 'family_id' from public.family_settings s),
    'members', coalesce((
      select jsonb_agg(to_jsonb(m) - 'family_id' order by m.created_at) from public.family_members m
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(to_jsonb(e) - 'family_id' || jsonb_build_object(
        'member_ids', coalesce((select jsonb_agg(em.member_id) from public.event_members em where em.event_id = e.id), '[]'::jsonb),
        'skipped_dates', coalesce((select jsonb_agg(es.skip_date order by es.skip_date) from public.event_skips es where es.event_id = e.id), '[]'::jsonb)
      ) order by e.starts_at) from public.events e
    ), '[]'::jsonb),
    'todos', coalesce((
      select jsonb_agg(to_jsonb(t) - 'family_id' || jsonb_build_object(
        'member_ids', coalesce((select jsonb_agg(tm.member_id) from public.todo_members tm where tm.todo_id = t.id), '[]'::jsonb)
      ) order by t.created_at) from public.todos t
    ), '[]'::jsonb),
    'chores', coalesce((
      select jsonb_agg(to_jsonb(c) - 'family_id' || jsonb_build_object(
        'member_ids', coalesce((select jsonb_agg(cm.member_id) from public.chore_members cm where cm.chore_id = c.id), '[]'::jsonb)
      ) order by c.created_at) from public.chores c
    ), '[]'::jsonb),
    'chore_completions', coalesce((
      select jsonb_agg(to_jsonb(cc) - 'family_id' order by cc.done_on) from public.chore_completions cc
    ), '[]'::jsonb)
  );
end;
$$;

-- Permanently deletes all of the active family's data (for "Delete family").
-- Runs with elevated rights because not every table lets parents delete (e.g. family_settings), so it checks
-- the caller itself and only ever touches rows of the caller's own active family.
create or replace function public.delete_family_data()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  family text := public.current_family_id();
begin
  if family is null or not public.is_family_admin() then
    raise exception 'Only family admins can delete family data' using errcode = '42501';
  end if;

  -- Link tables (event_members, event_skips, todo_members, chore_members, chore_completions) go with their
  -- parents through on delete cascade; chore_completions also carry family_id, so delete them explicitly too.
  delete from public.chore_completions where family_id = family;
  delete from public.chores where family_id = family;
  delete from public.todos where family_id = family;
  delete from public.events where family_id = family;
  delete from public.family_members where family_id = family;
  delete from public.family_settings where family_id = family;
end;
$$;

-- Data minimisation: removes chore ticks and finished to-dos older than 12 months, for every family.
-- Meant to run on a schedule (below), not by users.
create or replace function public.cleanup_old_data()
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  delete from public.chore_completions where done_on < (current_date - interval '12 months');
  delete from public.todos where done and created_at < (now() - interval '12 months');
$$;

revoke all on function public.export_family_data() from public, anon;
revoke all on function public.delete_family_data() from public, anon;
revoke all on function public.cleanup_old_data() from public, anon, authenticated;
grant execute on function public.export_family_data() to authenticated;
grant execute on function public.delete_family_data() to authenticated;

-- Run the clean-up every night at 03:00 UTC with Supabase's scheduler (pg_cron), if it's available.
-- If not, enable it under Integrations → Cron in the Supabase dashboard and run this block again.
do $do$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    execute $sql$select cron.schedule('famplan-cleanup-old-data', '0 3 * * *', 'select public.cleanup_old_data()')$sql$;
  else
    raise notice 'pg_cron is not available: enable it in the Supabase dashboard to schedule cleanup_old_data()';
  end if;
end;
$do$;
