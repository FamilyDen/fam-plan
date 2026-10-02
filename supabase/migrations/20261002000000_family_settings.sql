-- Per-family settings, starting with the family screen's night mode: between night_start and night_end
-- (local time, may cross midnight) the family screen dims to a quiet clock.
-- A family without a row uses the defaults (on, 22:00–06:00).

create table public.family_settings (
  family_id text primary key default public.current_family_id(),
  night_mode boolean not null default true,
  night_start time not null default '22:00',
  night_end time not null default '06:00',
  updated_at timestamptz not null default now()
);

alter table public.family_settings enable row level security;

-- Everyone in the family (including the family screen) reads the settings; only admins (parents) change them.
create policy "Family can read settings" on public.family_settings
  for select to authenticated
  using (family_id = (select public.current_family_id()));
create policy "Admins can add settings" on public.family_settings
  for insert to authenticated
  with check (family_id = (select public.current_family_id()) and (select public.is_family_admin()));
create policy "Admins can update settings" on public.family_settings
  for update to authenticated
  using (family_id = (select public.current_family_id()) and (select public.is_family_admin()))
  with check (family_id = (select public.current_family_id()) and (select public.is_family_admin()));

-- Live updates, so a family screen picks up new night hours right away.
alter publication supabase_realtime add table public.family_settings;
