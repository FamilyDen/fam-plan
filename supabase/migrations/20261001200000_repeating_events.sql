-- Repeating events. A repeating event is stored once with a rule; the app expands it into dates.
-- starts_at/ends_at describe the first occurrence (and its local time of day and duration).
--
--   repeat = 'weekly'           on repeat_weekdays (0 = Sunday … 6 = Saturday), every repeat_interval weeks
--   repeat = 'monthly_date'     on the day of the month of starts_at, every repeat_interval months
--   repeat = 'monthly_weekday'  on the repeat_week-th (1–4, or -1 = last) weekday of starts_at, every repeat_interval months
--
-- repeat_until is the last local date it may occur on (null = forever).
alter table public.events
  add column repeat text check (repeat in ('weekly', 'monthly_date', 'monthly_weekday')),
  add column repeat_interval smallint not null default 1 check (repeat_interval between 1 and 12),
  add column repeat_weekdays smallint[] check (repeat_weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  add column repeat_week smallint check (repeat_week in (1, 2, 3, 4, -1)),
  add column repeat_until date,
  add constraint events_repeat_rule check (
    (repeat is null)
    or (repeat = 'weekly' and coalesce(cardinality(repeat_weekdays), 0) > 0)
    or (repeat = 'monthly_date')
    or (repeat = 'monthly_weekday' and repeat_week is not null)
  );

-- Repeating events that may occur in a window are loaded by start and end date.
create index events_family_id_repeat_idx on public.events (family_id, repeat_until) where repeat is not null;

-- Single dates on which a repeating event doesn't happen (e.g. no football in the autumn holiday).
create table public.event_skips (
  event_id uuid not null references public.events (id) on delete cascade,
  skip_date date not null,
  primary key (event_id, skip_date)
);

alter table public.event_skips enable row level security;

-- Like events: the whole family can see skips; only family admins (parents) can add or remove them.
create policy "Family can read event skips" on public.event_skips
  for select to authenticated
  using (exists (
    select 1 from public.events e
    where e.id = event_id and e.family_id = (select public.current_family_id())
  ));
create policy "Admins can add event skips" on public.event_skips
  for insert to authenticated
  with check (
    (select public.is_family_admin())
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.family_id = (select public.current_family_id())
    )
  );
create policy "Admins can delete event skips" on public.event_skips
  for delete to authenticated
  using (
    (select public.is_family_admin())
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.family_id = (select public.current_family_id())
    )
  );

-- Live updates for skips too.
alter publication supabase_realtime add table public.event_skips;
