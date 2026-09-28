-- Families are Clerk Organizations. Parents sign in with Clerk and are admins of the organization.
-- The shared touch screen runs as the family's kiosk account (a plain member), so kids use the app
-- without their own login.
-- Everyone in the family (kids and parents) is a row in family_members.
--
-- Every row belongs to one family (the Clerk org id), and users can only read or change rows
-- of the family that is active in their Clerk session.

-- Active Clerk organization id from the session token (v2 uses the "o" claim, v1 used "org_id").
create or replace function public.current_family_id()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'o' ->> 'id', auth.jwt() ->> 'org_id')
$$;

-- True when the user is an admin (a parent) of the active family. The shared touch screen's
-- kiosk account is a plain member, so it can use the app but not manage the family.
-- Token v2 has "o": {"rol": "admin"}; v1 had "org_role": "org:admin".
create or replace function public.is_family_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'o' ->> 'rol', auth.jwt() ->> 'org_role') in ('admin', 'org:admin')
$$;

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id text not null default public.current_family_id(),
  name text not null check (length(trim(name)) > 0),
  role text not null default 'child' check (role in ('parent', 'child')),
  color text,
  -- Set for parents who have a Clerk login; kids have none.
  clerk_user_id text,
  created_at timestamptz not null default now(),
  unique (family_id, clerk_user_id)
);

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  family_id text not null default public.current_family_id(),
  title text not null check (length(trim(title)) > 0),
  done boolean not null default false,
  assigned_to uuid references public.family_members (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  family_id text not null default public.current_family_id(),
  title text not null check (length(trim(title)) > 0),
  starts_at timestamptz not null,
  ends_at timestamptz check (ends_at is null or ends_at >= starts_at),
  created_at timestamptz not null default now()
);

-- Which family members take part in an event.
create table public.event_members (
  event_id uuid not null references public.events (id) on delete cascade,
  member_id uuid not null references public.family_members (id) on delete cascade,
  primary key (event_id, member_id)
);

create index family_members_family_id_idx on public.family_members (family_id);
create index todos_family_id_idx on public.todos (family_id);
create index todos_assigned_to_idx on public.todos (assigned_to);
create index events_family_id_starts_at_idx on public.events (family_id, starts_at);
create index event_members_member_id_idx on public.event_members (member_id);

alter table public.family_members enable row level security;
alter table public.todos enable row level security;
alter table public.events enable row level security;
alter table public.event_members enable row level security;

-- family_members: everyone in the family can see members; only admins can manage them.
create policy "Family can read members" on public.family_members
  for select to authenticated
  using (family_id = (select public.current_family_id()));
create policy "Admins can add members" on public.family_members
  for insert to authenticated
  with check (family_id = (select public.current_family_id()) and (select public.is_family_admin()));
create policy "Admins can update members" on public.family_members
  for update to authenticated
  using (family_id = (select public.current_family_id()) and (select public.is_family_admin()))
  with check (family_id = (select public.current_family_id()) and (select public.is_family_admin()));
create policy "Admins can delete members" on public.family_members
  for delete to authenticated
  using (family_id = (select public.current_family_id()) and (select public.is_family_admin()));

-- todos and events: everyone in the family, including the kiosk, has full access.
create policy "Family can read todos" on public.todos
  for select to authenticated
  using (family_id = (select public.current_family_id()));
create policy "Family can add todos" on public.todos
  for insert to authenticated
  with check (
    family_id = (select public.current_family_id())
    and (assigned_to is null or exists (
      select 1 from public.family_members m
      where m.id = assigned_to and m.family_id = (select public.current_family_id())
    ))
  );
create policy "Family can update todos" on public.todos
  for update to authenticated
  using (family_id = (select public.current_family_id()))
  with check (
    family_id = (select public.current_family_id())
    and (assigned_to is null or exists (
      select 1 from public.family_members m
      where m.id = assigned_to and m.family_id = (select public.current_family_id())
    ))
  );
create policy "Family can delete todos" on public.todos
  for delete to authenticated
  using (family_id = (select public.current_family_id()));

create policy "Family can read events" on public.events
  for select to authenticated
  using (family_id = (select public.current_family_id()));
create policy "Family can add events" on public.events
  for insert to authenticated
  with check (family_id = (select public.current_family_id()));
create policy "Family can update events" on public.events
  for update to authenticated
  using (family_id = (select public.current_family_id()))
  with check (family_id = (select public.current_family_id()));
create policy "Family can delete events" on public.events
  for delete to authenticated
  using (family_id = (select public.current_family_id()));

-- event_members has no family_id; access follows the event (and the member must be in the same family).
create policy "Family can read event members" on public.event_members
  for select to authenticated
  using (exists (
    select 1 from public.events e
    where e.id = event_id and e.family_id = (select public.current_family_id())
  ));
create policy "Family can add event members" on public.event_members
  for insert to authenticated
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.family_id = (select public.current_family_id())
    )
    and exists (
      select 1 from public.family_members m
      where m.id = member_id and m.family_id = (select public.current_family_id())
    )
  );
create policy "Family can delete event members" on public.event_members
  for delete to authenticated
  using (exists (
    select 1 from public.events e
    where e.id = event_id and e.family_id = (select public.current_family_id())
  ));
