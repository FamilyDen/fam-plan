-- Events: support all-day events, and let only family admins (parents) add, change or remove them.
-- Everyone in the family, including the kiosk, can still see events and who takes part.

-- All-day events store local midnight of their day in starts_at and have no ends_at.
alter table public.events add column all_day boolean not null default false;

drop policy "Family can add events" on public.events;
drop policy "Family can update events" on public.events;
drop policy "Family can delete events" on public.events;

create policy "Admins can add events" on public.events
  for insert to authenticated
  with check (family_id = (select public.current_family_id()) and (select public.is_family_admin()));
create policy "Admins can update events" on public.events
  for update to authenticated
  using (family_id = (select public.current_family_id()) and (select public.is_family_admin()))
  with check (family_id = (select public.current_family_id()) and (select public.is_family_admin()));
create policy "Admins can delete events" on public.events
  for delete to authenticated
  using (family_id = (select public.current_family_id()) and (select public.is_family_admin()));

drop policy "Family can add event members" on public.event_members;
drop policy "Family can delete event members" on public.event_members;

create policy "Admins can add event members" on public.event_members
  for insert to authenticated
  with check (
    (select public.is_family_admin())
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.family_id = (select public.current_family_id())
    )
    and exists (
      select 1 from public.family_members m
      where m.id = member_id and m.family_id = (select public.current_family_id())
    )
  );
create policy "Admins can delete event members" on public.event_members
  for delete to authenticated
  using (
    (select public.is_family_admin())
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.family_id = (select public.current_family_id())
    )
  );
