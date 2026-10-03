-- Chores with stars. Parents set up recurring chores for family members (usually the kids); on each day a
-- chore applies to, every assigned member can tick it off for themselves and earns its stars. Each member
-- can have a weekly star goal with an optional reward.
--
-- Parents (family admins) create, change and delete chores and goals. Everyone in the family, including
-- the family screen, can tick chores off and undo a tick.

alter table public.family_members
  add column weekly_star_goal smallint check (weekly_star_goal between 1 and 500),
  add column weekly_reward text check (length(weekly_reward) <= 80);

create table public.chores (
  id uuid primary key default gen_random_uuid(),
  family_id text not null default public.current_family_id(),
  title text not null check (length(trim(title)) > 0),
  stars smallint not null default 1 check (stars between 1 and 3),
  -- Days it applies to: 0 = Sunday … 6 = Saturday (every day = all seven).
  weekdays smallint[] not null check (cardinality(weekdays) > 0 and weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  created_at timestamptz not null default now()
);

-- Who does the chore; each of them ticks it off separately.
create table public.chore_members (
  chore_id uuid not null references public.chores (id) on delete cascade,
  member_id uuid not null references public.family_members (id) on delete cascade,
  primary key (chore_id, member_id)
);

-- A chore done by a member on a (local) date, with the stars it earned at the time.
create table public.chore_completions (
  chore_id uuid not null,
  member_id uuid not null,
  done_on date not null,
  family_id text not null default public.current_family_id(),
  stars smallint not null check (stars between 1 and 3),
  created_at timestamptz not null default now(),
  primary key (chore_id, member_id, done_on),
  -- Only members assigned to the chore; unassigning or deleting removes their completions.
  foreign key (chore_id, member_id) references public.chore_members (chore_id, member_id) on delete cascade
);

create index chores_family_id_idx on public.chores (family_id);
create index chore_members_member_id_idx on public.chore_members (member_id);
create index chore_completions_family_done_on_idx on public.chore_completions (family_id, done_on);

alter table public.chores enable row level security;
alter table public.chore_members enable row level security;
alter table public.chore_completions enable row level security;

-- chores: the family reads them; parents manage them.
create policy "Family can read chores" on public.chores
  for select to authenticated
  using (family_id = (select public.current_family_id()));
create policy "Admins can add chores" on public.chores
  for insert to authenticated
  with check (family_id = (select public.current_family_id()) and (select public.is_family_admin()));
create policy "Admins can update chores" on public.chores
  for update to authenticated
  using (family_id = (select public.current_family_id()) and (select public.is_family_admin()))
  with check (family_id = (select public.current_family_id()) and (select public.is_family_admin()));
create policy "Admins can delete chores" on public.chores
  for delete to authenticated
  using (family_id = (select public.current_family_id()) and (select public.is_family_admin()));

-- chore_members: follows the chore; the member must be in the same family.
create policy "Family can read chore members" on public.chore_members
  for select to authenticated
  using (exists (
    select 1 from public.chores c
    where c.id = chore_id and c.family_id = (select public.current_family_id())
  ));
create policy "Admins can add chore members" on public.chore_members
  for insert to authenticated
  with check (
    (select public.is_family_admin())
    and exists (
      select 1 from public.chores c
      where c.id = chore_id and c.family_id = (select public.current_family_id())
    )
    and exists (
      select 1 from public.family_members m
      where m.id = member_id and m.family_id = (select public.current_family_id())
    )
  );
create policy "Admins can delete chore members" on public.chore_members
  for delete to authenticated
  using (
    (select public.is_family_admin())
    and exists (
      select 1 from public.chores c
      where c.id = chore_id and c.family_id = (select public.current_family_id())
    )
  );

-- chore_completions: anyone in the family ticks chores off (and undoes it), for chores of their family.
create policy "Family can read chore completions" on public.chore_completions
  for select to authenticated
  using (family_id = (select public.current_family_id()));
create policy "Family can complete chores" on public.chore_completions
  for insert to authenticated
  with check (
    family_id = (select public.current_family_id())
    -- and the stars must be the chore's own, so a completion can't claim more.
    and exists (
      select 1 from public.chores c
      where c.id = chore_completions.chore_id and c.family_id = (select public.current_family_id())
        and c.stars = chore_completions.stars
    )
  );
create policy "Family can undo chore completions" on public.chore_completions
  for delete to authenticated
  using (family_id = (select public.current_family_id()));

-- Live updates: a tick on the family screen shows up on parents' phones right away.
alter publication supabase_realtime add table public.chores, public.chore_members, public.chore_completions;
