-- To-dos for several family members: who a to-do is for moves from todos.assigned_to (one member)
-- to the todo_members link table (any number), like event_members for events.
--
-- todos.assigned_to is kept for now so the previous app version keeps working until the new one is
-- deployed; the app no longer reads or writes it, and a later migration can drop it.

create table public.todo_members (
  todo_id uuid not null references public.todos (id) on delete cascade,
  member_id uuid not null references public.family_members (id) on delete cascade,
  primary key (todo_id, member_id)
);

create index todo_members_member_id_idx on public.todo_members (member_id);

-- Keep existing assignments.
insert into public.todo_members (todo_id, member_id)
select id, assigned_to from public.todos where assigned_to is not null
on conflict do nothing;

comment on column public.todos.assigned_to is 'Deprecated: replaced by todo_members. Not used by the app.';

alter table public.todo_members enable row level security;

-- Like todos, everyone in the family (including the kiosk) can see and change who a to-do is for,
-- but only with to-dos and members of their own family.
create policy "Family can read todo members" on public.todo_members
  for select to authenticated
  using (exists (
    select 1 from public.todos t
    where t.id = todo_id and t.family_id = (select public.current_family_id())
  ));
create policy "Family can add todo members" on public.todo_members
  for insert to authenticated
  with check (
    exists (
      select 1 from public.todos t
      where t.id = todo_id and t.family_id = (select public.current_family_id())
    )
    and exists (
      select 1 from public.family_members m
      where m.id = member_id and m.family_id = (select public.current_family_id())
    )
  );
create policy "Family can delete todo members" on public.todo_members
  for delete to authenticated
  using (exists (
    select 1 from public.todos t
    where t.id = todo_id and t.family_id = (select public.current_family_id())
  ));

-- Live updates.
alter publication supabase_realtime add table public.todo_members;
