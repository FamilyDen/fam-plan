-- Clean-up: todos.assigned_to was replaced by the todo_members link table (20261001300000_todo_members.sql)
-- and is no longer read or written by the app. The original add/update policies still check it, so they are
-- recreated without it first; who a to-do is for is checked by todo_members' own policies.

drop policy "Family can add todos" on public.todos;
drop policy "Family can update todos" on public.todos;

create policy "Family can add todos" on public.todos
  for insert to authenticated
  with check (family_id = (select public.current_family_id()));
create policy "Family can update todos" on public.todos
  for update to authenticated
  using (family_id = (select public.current_family_id()))
  with check (family_id = (select public.current_family_id()));

-- Also removes its index (todos_assigned_to_idx).
alter table public.todos drop column assigned_to;
