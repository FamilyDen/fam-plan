-- The family's language (e.g. 'en', 'da'): used by the family screen and as the default for everyone in the
-- family; parents can still pick their own language (stored on their Clerk account). Null means not chosen
-- yet, in which case the app follows the browser's language. Codes are validated by shape so adding a
-- language needs no migration.
alter table public.family_settings
  add column language text check (language ~ '^[a-z]{2}(-[A-Z]{2})?$');
