import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

// Test helpers: an in-memory Postgres (PGlite) with just enough of Supabase to run our migrations and
// check row-level security as different users.

const MIGRATIONS_DIR = join(import.meta.dirname, "..", "migrations")

export const migrationFiles = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()

// What Supabase provides: auth.jwt() (read from a setting we control), the authenticated and anon roles
// (with table grants for authenticated), and the supabase_realtime publication.
const SUPABASE_STAND_IN = `
  create schema auth;
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
  $$;
  create role authenticated nologin;
  create role anon nologin;
  grant usage on schema public, auth to authenticated;
  grant execute on function auth.jwt() to authenticated;
  alter default privileges in schema public grant all on tables to authenticated;
  create publication supabase_realtime;
`

// A fresh database with the given migrations (all of them by default) applied in order.
export async function createDatabase(files = migrationFiles) {
  const db = new PGlite()
  await db.exec(SUPABASE_STAND_IN)
  await runMigrations(db, files)
  return db
}

export async function runMigrations(db: PGlite, files: string[]) {
  for (const file of files) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"))
  }
}

// Clerk session token claims (v2 shape) for a user in a family (organization).
export type Claims = { sub: string, o?: { id: string, rol: string } }

export const parentA: Claims = { sub: "user_parent_a", o: { id: "org_a", rol: "admin" } }
export const screenA: Claims = { sub: "user_screen_a", o: { id: "org_a", rol: "member" } } // the family screen
export const parentB: Claims = { sub: "user_parent_b", o: { id: "org_b", rol: "admin" } }

// Runs one statement as the `authenticated` role with the given token claims, like a request from the app.
export async function as<T = Record<string, unknown>>(db: PGlite, claims: Claims, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; select set_config('request.jwt.claims', '${JSON.stringify(claims)}', false); set role authenticated;`)
  try {
    return (await db.query<T>(sql, params)).rows
  } finally {
    await db.exec("reset role")
  }
}

export const RLS_VIOLATION = /violates row-level security policy/
