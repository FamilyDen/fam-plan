import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { as, createDatabase, parentA, parentB, screenA } from "./db.ts";

// export_family_data(), delete_family_data() and cleanup_old_data() from 20261006000000_gdpr.sql.
// Each test starts from a fresh database with two families that both have data in every table.

let db: PGlite

async function fillFamily(claims: typeof parentA, name: string) {
  const kid = (await as<{ id: string }>(db, claims, "insert into family_members (name) values ($1) returning id", [name]))[0].id
  const event = (await as<{ id: string }>(db, claims,
    "insert into events (title, starts_at, repeat, repeat_weekdays) values ($1, now(), 'weekly', '{1}') returning id", [`${name}'s football`]))[0].id
  await as(db, claims, "insert into event_members values ($1, $2)", [event, kid])
  await as(db, claims, "insert into event_skips values ($1, current_date)", [event])
  const todo = (await as<{ id: string }>(db, claims, "insert into todos (title) values ($1) returning id", [`${name}'s room`]))[0].id
  await as(db, claims, "insert into todo_members values ($1, $2)", [todo, kid])
  const chore = (await as<{ id: string }>(db, claims, "insert into chores (title, stars, weekdays) values ('Bed', 1, '{0,1,2,3,4,5,6}') returning id"))[0].id
  await as(db, claims, "insert into chore_members values ($1, $2)", [chore, kid])
  await as(db, claims, "insert into chore_completions (chore_id, member_id, done_on, stars) values ($1, $2, current_date, 1)", [chore, kid])
  await as(db, claims, "insert into family_settings (language) values ('da')")
}

const TABLES = ["family_members", "events", "event_members", "event_skips", "todos", "todo_members", "chores", "chore_members", "chore_completions", "family_settings"]

// Row counts per table, as the superuser (ignoring row-level security).
async function counts() {
  const result: Record<string, number> = {}
  for (const table of TABLES) {
    result[table] = Number(((await db.query<{ n: number }>(`select count(*) as n from public.${table}`)).rows[0]).n)
  }
  return result
}

beforeEach(async () => {
  db = await createDatabase()
  await fillFamily(parentA, "Emma")
  await fillFamily(parentB, "Stranger")
})

describe("export_family_data", () => {
  it("gives a parent all of their own family's data, and nothing of other families", async () => {
    const [{ data }] = await as<{ data: Record<string, unknown[]> & { settings: { language: string } } }>(db, parentA, "select public.export_family_data() as data")
    expect(data.family_id).toBe("org_a")
    expect(data.members).toHaveLength(1)
    expect(JSON.stringify(data)).toContain("Emma")
    expect(JSON.stringify(data)).not.toContain("Stranger")
    expect(data.events).toHaveLength(1)
    expect(data.events[0]).toMatchObject({ title: "Emma's football", member_ids: [expect.any(String)], skipped_dates: [expect.any(String)] })
    expect(data.todos[0]).toMatchObject({ title: "Emma's room", member_ids: [expect.any(String)] })
    expect(data.chores[0]).toMatchObject({ title: "Bed", member_ids: [expect.any(String)] })
    expect(data.chore_completions).toHaveLength(1)
    expect(data.settings.language).toBe("da")
    expect(JSON.stringify(data)).not.toContain("org_b")
  })

  it("is not available to the family screen", async () => {
    await expect(as(db, screenA, "select public.export_family_data()")).rejects.toThrow(/Only family admins/)
  })
})

describe("delete_family_data", () => {
  it("deletes every row of the parent's family and leaves other families alone", async () => {
    await as(db, parentA, "select public.delete_family_data()")
    const after = await counts()
    // Only family B's single row remains in every table.
    expect(Object.values(after).every((n) => n === 1)).toBe(true)
    expect(await as(db, parentA, "select id from family_members")).toHaveLength(0)
    expect(await as(db, parentB, "select name from family_members")).toEqual([{ name: "Stranger" }])
  })

  it("can't be run by the family screen", async () => {
    await expect(as(db, screenA, "select public.delete_family_data()")).rejects.toThrow(/Only family admins/)
    expect(Object.values(await counts()).every((n) => n === 2)).toBe(true)
  })

  it("can't be run without an active family", async () => {
    await expect(as(db, { sub: "user_no_family" }, "select public.delete_family_data()")).rejects.toThrow(/Only family admins/)
  })
})

describe("cleanup_old_data", () => {
  it("removes chore ticks and finished to-dos older than 12 months, and nothing newer", async () => {
    await db.exec(`
      update chore_completions set done_on = current_date - interval '13 months' where family_id = 'org_a';
      update todos set done = true, created_at = now() - interval '13 months' where family_id = 'org_a';
      insert into todos (family_id, title, done, created_at) values ('org_a', 'Old but open', false, now() - interval '2 years');
      insert into todos (family_id, title, done, created_at) values ('org_a', 'Recent and done', true, now() - interval '1 month');
    `)
    await db.query("select public.cleanup_old_data()")
    const { rows: todos } = await db.query<{ title: string }>("select title from todos where family_id = 'org_a' order by title")
    expect(todos.map((t) => t.title)).toEqual(["Old but open", "Recent and done"])
    const { rows: ticks } = await db.query("select 1 from chore_completions where family_id = 'org_a'")
    expect(ticks).toHaveLength(0)
    const { rows: otherTicks } = await db.query("select 1 from chore_completions where family_id = 'org_b'")
    expect(otherTicks).toHaveLength(1)
  })

  it("can't be called by app users", async () => {
    await expect(as(db, parentA, "select public.cleanup_old_data()")).rejects.toThrow(/permission denied/)
  })
})
