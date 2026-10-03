# FamPlan

A family planner for a shared touch screen in the family room. Parents sign in with their own accounts;
kids use the **family screen** without logging in. Live at [wefamplan.com](https://wefamplan.com).

- **Home:** this week's events (one-off and repeating) and the family's to-dos, side by side
- **Members:** everyone in the family, kids included, each with their own color
- **Family screen:** a tablet that stays signed in as the family's screen account, with a big clock, night
  mode and a parent PIN to unlock it
- Changes show up on every screen within a second (Supabase Realtime)

## Stack

| Part | What | Where |
| --- | --- | --- |
| App | React 18 + TypeScript + Vite, React Router | `src/` |
| Sign-in and families | [Clerk](https://clerk.com): users, and families as Organizations (parents are `org:admin`) | |
| Database | [Supabase](https://supabase.com) Postgres with row-level security, Realtime | `supabase/migrations/` |
| Server functions | Vercel Functions (family screen sign-in and PIN) using the Clerk secret key | `api/` |
| Hosting | Vercel: `main` → production, other branches → previews | |

### How access works

- Every row belongs to a family (`family_id` = the Clerk organization id). Row-level security only lets a
  session read and write rows of its active family, using claims from the Clerk session token.
- **Parents** (`org:admin`) can manage members, events and settings.
- **The family screen** is a per-family Clerk user with the plain member role. It can read everything, tick
  off and add to-dos, but can't change members, events or settings. Parents unlock it with a PIN, which is
  checked by `api/kiosk-exit.ts` and stored only as a salted hash in Clerk private metadata.
- Code, routes and API paths still use the older name "kiosk" for the family screen.

## Languages

The app is available in **English** and **Danish** (i18next; texts in `src/i18n/locales/*.json`):

- **Which language:** your own choice (stored on your Clerk account), else the **family language**
  (`family_settings.language`, set by parents; also used by the family screen), else the browser's language.
  Both are changed from the avatar menu under **Language**.
- **Formats follow the language:** dates, 24-hour times and the first day of the week come from the locale in
  `LANGUAGES` (`src/i18n/index.ts`). Form values (`<input type="date|time">`) always use `2026-10-03` / `17:30`.
- Clerk's own screens (sign-in, account, family settings) use Clerk's translation for the same language,
  loaded only when that language is in use.
- **Adding a language:** add `src/i18n/locales/<code>.json` (copy `en.json`), an entry in `LANGUAGES`, and the
  Clerk translation in `CLERK_LOCALIZATIONS` (`src/components/AppProviders.tsx`), if Clerk has one.
  `src/i18n/translations.test.ts` fails if a text or a plural form is missing.

## Privacy and data (GDPR)

- **Family data** page (avatar menu, parents only):
  - **Download** gives one JSON file with the family's accounts (from Clerk) and all of its data (`export_family_data()`)
  - **Delete family** removes all of the family's data (`delete_family_data()`), then its family screen account and the family itself in Clerk (`api/family-delete.ts`)
- **Automatic clean-up:** `cleanup_old_data()` removes chore ticks and finished to-dos older than 12 months. It runs nightly with Supabase's scheduler (pg_cron), which the migration sets up if it's available; otherwise enable **Cron** in the Supabase dashboard and run the migration's last block again.
- Data processors: Clerk (accounts), Supabase (family data), Vercel (hosting). There's no analytics or tracking, and the only cookies are Clerk's sign-in cookies.

## Getting started

```bash
yarn install
yarn dev        # app on http://localhost:5173, including the api/ functions
```

### Environment

`.env` is committed and holds **public** values for development: the Clerk publishable keys and the
**development** Supabase project.

For the `api/` functions, create **`.env.local`** (git-ignored, never committed). See `.env.example`:

```
CLERK_SECRET_KEY=sk_test_...      # Clerk *development* instance, same as the browser's pk_test_ key
CLERK_PUBLISHABLE_KEY=pk_test_...
KIOSK_EMAIL_DOMAIN=wefamplan.com  # family screen accounts get kiosk+<org>@<domain> addresses
```

Server keys must come from the same Clerk instance as the browser key. Mixing development and production
keys makes every `/api` call return 401.

## Scripts

| Command | Does |
| --- | --- |
| `yarn dev` | Dev server, which also serves `api/*` (see `vite.config.ts`) |
| `yarn build` | Type-checks `src/`, `api/` and config, then builds to `dist/` |
| `yarn lint` | ESLint |
| `yarn test` | Vitest: unit tests and database access-rule tests (see below) |

## Tests

`yarn test` runs in the `Europe/Copenhagen` time zone:

- **Unit tests** next to the code: repeating events and dates across daylight saving
  (`src/lib/*.test.ts`), night mode, and PIN hashing and lockout (`api/_lib/pin.test.ts`).
- **Database tests** (`supabase/tests/`): every migration is applied in order to an in-memory Postgres
  ([PGlite](https://pglite.dev)) with a small stand-in for Supabase's `auth.jwt()`. Then the row-level
  security is checked as a parent, the family screen and another family.

GitHub Actions (`.github/workflows/ci.yml`) runs lint, build and tests on every pull request and on pushes to
`develop` and `main`.

## Database migrations

SQL migrations live in `supabase/migrations/`, named `YYYYMMDDHHMMSS_description.sql`, and are applied
**by hand** in each Supabase project's SQL Editor, in order:

1. Add the migration in your feature branch, and cover it in `supabase/tests/database.test.ts`.
2. Run it on the **development** project before testing locally.
3. Run it on the **production** project **before** merging the release into `main`. Keep migrations safe to
   run while the previous app version is live (add first, remove later).

A brand-new project needs all files in order.

## Branches and releases

- `develop` and `main` are protected: changes go through pull requests with a code-owner review.
- Feature branches → PR into `develop`.
- Release: PR `develop` → `main`, merged with a **merge commit** (not squash) so the two stay in sync. The
  release PR lists any migrations to run on production first.

## Production setup

Production (wefamplan.com) has its own Clerk production instance and its own Supabase project:

- **Vercel → Environment Variables → Production:**
  - `VITE_CLERK_PRODUCTION_PUBLISHABLE_KEY` comes from the committed `.env`
  - `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the **production** Supabase project. They
    must start with `VITE_` (Vite ignores the integration's `NEXT_PUBLIC_*` names). They're baked in at
    build time, so redeploy after changing them.
  - `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY` (`sk_live_` / `pk_live_`), and `KIOSK_EMAIL_DOMAIN`, for
    `api/`.
- **Clerk production instance:** Organizations enabled; the Supabase integration activated (it adds the
  `role: authenticated` claim, without which Supabase treats everyone as anonymous); a long session lifetime
  for the family screen.
- **Supabase production project:** Clerk added as a third-party auth provider, with the production Clerk
  domain; all migrations applied.
