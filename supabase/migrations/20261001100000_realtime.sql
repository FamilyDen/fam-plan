-- Live updates: let Supabase Realtime send changes to these tables to the app, so a to-do ticked on a
-- parent's phone appears on the kiosk right away. Realtime applies the same row-level security
-- policies, so each screen only receives changes from its own family.
alter publication supabase_realtime add table public.family_members, public.todos, public.events, public.event_members;
