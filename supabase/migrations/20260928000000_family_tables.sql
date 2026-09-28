-- Families are Clerk Organizations. Every row belongs to one family (the Clerk org id),
-- and users can only read or change rows of the family that is active in their Clerk session.

-- Active Clerk organization id from the session token (v2 uses the "o" claim, v1 used "org_id").
create or replace function public.current_family_id()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'o' ->> 'id', auth.jwt() ->> 'org_id')
$$;

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  family_id text not null default public.current_family_id(),
  title text not null check (length(trim(title)) > 0),
  done boolean not null default false,
  created_by text not null default auth.jwt() ->> 'sub',
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  family_id text not null default public.current_family_id(),
  title text not null check (length(trim(title)) > 0),
  starts_at timestamptz not null,
  ends_at timestamptz check (ends_at is null or ends_at >= starts_at),
  created_by text not null default auth.jwt() ->> 'sub',
  created_at timestamptz not null default now()
);

create index todos_family_id_idx on public.todos (family_id);
create index events_family_id_starts_at_idx on public.events (family_id, starts_at);

alter table public.todos enable row level security;
alter table public.events enable row level security;

create policy "Family members can read todos" on public.todos
  for select to authenticated
  using (family_id = (select public.current_family_id()));
create policy "Family members can add todos" on public.todos
  for insert to authenticated
  with check (family_id = (select public.current_family_id()) and created_by = (select auth.jwt() ->> 'sub'));
create policy "Family members can update todos" on public.todos
  for update to authenticated
  using (family_id = (select public.current_family_id()))
  with check (family_id = (select public.current_family_id()));
create policy "Family members can delete todos" on public.todos
  for delete to authenticated
  using (family_id = (select public.current_family_id()));

create policy "Family members can read events" on public.events
  for select to authenticated
  using (family_id = (select public.current_family_id()));
create policy "Family members can add events" on public.events
  for insert to authenticated
  with check (family_id = (select public.current_family_id()) and created_by = (select auth.jwt() ->> 'sub'));
create policy "Family members can update events" on public.events
  for update to authenticated
  using (family_id = (select public.current_family_id()))
  with check (family_id = (select public.current_family_id()));
create policy "Family members can delete events" on public.events
  for delete to authenticated
  using (family_id = (select public.current_family_id()));
