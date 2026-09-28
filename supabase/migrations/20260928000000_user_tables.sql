-- Each row belongs to one user (the Clerk user id from the session token's "sub" claim),
-- and users can only read or change their own rows.

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default auth.jwt() ->> 'sub',
  title text not null check (length(trim(title)) > 0),
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default auth.jwt() ->> 'sub',
  title text not null check (length(trim(title)) > 0),
  starts_at timestamptz not null,
  ends_at timestamptz check (ends_at is null or ends_at >= starts_at),
  created_at timestamptz not null default now()
);

create index todos_user_id_idx on public.todos (user_id);
create index events_user_id_starts_at_idx on public.events (user_id, starts_at);

alter table public.todos enable row level security;
alter table public.events enable row level security;

create policy "Users can read their own todos" on public.todos
  for select to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));
create policy "Users can add their own todos" on public.todos
  for insert to authenticated
  with check (user_id = (select auth.jwt() ->> 'sub'));
create policy "Users can update their own todos" on public.todos
  for update to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'))
  with check (user_id = (select auth.jwt() ->> 'sub'));
create policy "Users can delete their own todos" on public.todos
  for delete to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));

create policy "Users can read their own events" on public.events
  for select to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));
create policy "Users can add their own events" on public.events
  for insert to authenticated
  with check (user_id = (select auth.jwt() ->> 'sub'));
create policy "Users can update their own events" on public.events
  for update to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'))
  with check (user_id = (select auth.jwt() ->> 'sub'));
create policy "Users can delete their own events" on public.events
  for delete to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));
