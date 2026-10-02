import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { as, createDatabase, migrationFiles, parentA, parentB, RLS_VIOLATION, runMigrations, screenA } from "./db.ts";

// Row-level security for every table, as a parent (family admin), the family screen (a plain member of the
// same family) and a parent of another family. All migrations are applied in order, as on Supabase.

let db: PGlite
let kid: string

beforeAll(async () => {
  db = await createDatabase()
  kid = (await as<{ id: string }>(db, parentA, "insert into family_members (name) values ('Emma') returning id"))[0].id
})

describe("schema", () => {
  it("runs every migration in order", () => {
    expect(migrationFiles.length).toBeGreaterThan(0)
  })

  it("sends live updates for every app table", async () => {
    const { rows } = await db.query<{ tablename: string }>("select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1")
    expect(rows.map((r) => r.tablename)).toEqual(
      ["event_members", "event_skips", "events", "family_members", "family_settings", "todo_members", "todos"])
  })

  it("no longer has todos.assigned_to", async () => {
    const { rows } = await db.query("select 1 from information_schema.columns where table_name = 'todos' and column_name = 'assigned_to'")
    expect(rows).toHaveLength(0)
  })
})

describe("family_members", () => {
  it("can be read by the whole family, including the family screen", async () => {
    expect(await as(db, screenA, "select id from family_members")).toHaveLength(1)
  })

  it("can only be added, changed and removed by parents", async () => {
    await expect(as(db, screenA, "insert into family_members (name) values ('Hacker')")).rejects.toThrow(RLS_VIOLATION)
    expect(await as(db, screenA, "update family_members set name = 'x' returning id")).toHaveLength(0)
    expect(await as(db, screenA, "delete from family_members returning id")).toHaveLength(0)
    expect(await as(db, parentA, "update family_members set color = '#ec4899' where id = $1 returning id", [kid])).toHaveLength(1)
  })

  it("are invisible to other families", async () => {
    expect(await as(db, parentB, "select id from family_members")).toHaveLength(0)
  })
})

describe("todos and todo_members", () => {
  let todo: string

  beforeAll(async () => {
    todo = (await as<{ id: string }>(db, screenA, "insert into todos (title) values ('Tidy room') returning id"))[0].id
  })

  it("can be added and assigned by the family screen", async () => {
    expect(await as(db, screenA, "insert into todo_members values ($1, $2) returning todo_id", [todo, kid])).toHaveLength(1)
    expect(await as(db, screenA, "update todos set done = true where id = $1 returning id", [todo])).toHaveLength(1)
  })

  it("can't be assigned to another family's member, or linked to another family's to-do", async () => {
    const stranger = (await as<{ id: string }>(db, parentB, "insert into family_members (name) values ('Stranger') returning id"))[0].id
    await expect(as(db, screenA, "insert into todo_members values ($1, $2)", [todo, stranger])).rejects.toThrow(RLS_VIOLATION)
    const theirs = (await as<{ id: string }>(db, parentB, "insert into todos (title) values ('Theirs') returning id"))[0].id
    await expect(as(db, screenA, "insert into todo_members values ($1, $2)", [theirs, kid])).rejects.toThrow(RLS_VIOLATION)
  })

  it("are invisible to other families", async () => {
    expect(await as(db, parentB, "select id from todos where id = $1", [todo])).toHaveLength(0)
    expect(await as(db, parentB, "select todo_id from todo_members where todo_id = $1", [todo])).toHaveLength(0)
  })

  it("take their member links along when deleted", async () => {
    await as(db, screenA, "delete from todos where id = $1", [todo])
    const { rows } = await db.query("select 1 from todo_members where todo_id = $1", [todo])
    expect(rows).toHaveLength(0)
  })
})

describe("events, event_members and event_skips", () => {
  let event: string

  beforeAll(async () => {
    event = (await as<{ id: string }>(db, parentA,
      "insert into events (title, starts_at, repeat, repeat_weekdays) values ('Football', '2026-10-06 17:00+02', 'weekly', '{2,4}') returning id"))[0].id
    await as(db, parentA, "insert into event_members values ($1, $2)", [event, kid])
    await as(db, parentA, "insert into event_skips values ($1, '2026-10-13')", [event])
  })

  it("can be read by the family screen", async () => {
    expect(await as(db, screenA, "select id from events")).toHaveLength(1)
    expect(await as(db, screenA, "select event_id from event_members")).toHaveLength(1)
    expect(await as(db, screenA, "select event_id from event_skips")).toHaveLength(1)
  })

  it("can only be changed by parents", async () => {
    await expect(as(db, screenA, "insert into events (title, starts_at) values ('x', now())")).rejects.toThrow(RLS_VIOLATION)
    expect(await as(db, screenA, "update events set title = 'x' returning id")).toHaveLength(0)
    expect(await as(db, screenA, "delete from events returning id")).toHaveLength(0)
    await expect(as(db, screenA, "insert into event_members values ($1, $2)", [event, kid])).rejects.toThrow(RLS_VIOLATION)
    await expect(as(db, screenA, "insert into event_skips values ($1, '2026-10-20')", [event])).rejects.toThrow(RLS_VIOLATION)
    expect(await as(db, screenA, "delete from event_skips returning event_id")).toHaveLength(0)
  })

  it("are invisible to other families", async () => {
    expect(await as(db, parentB, "select id from events")).toHaveLength(0)
    expect(await as(db, parentB, "select event_id from event_members")).toHaveLength(0)
    expect(await as(db, parentB, "select event_id from event_skips")).toHaveLength(0)
  })

  it("reject invalid repeat rules", async () => {
    const insert = (columns: string, values: string) => as(db, parentA, `insert into events (title, starts_at, ${columns}) values ('x', now(), ${values})`)
    await expect(insert("repeat", "'weekly'")).rejects.toThrow(/events_repeat_rule/) // weekly needs weekdays
    await expect(insert("repeat, repeat_weekdays", "'weekly', '{}'")).rejects.toThrow(/events_repeat_rule/)
    await expect(insert("repeat, repeat_weekdays", "'weekly', '{7}'")).rejects.toThrow(/repeat_weekdays/)
    await expect(insert("repeat", "'monthly_weekday'")).rejects.toThrow(/events_repeat_rule/) // needs repeat_week
    await expect(insert("repeat, repeat_weekdays, repeat_interval", "'weekly', '{1}', 0")).rejects.toThrow(/repeat_interval/)
  })

  it("take their members and skips along when deleted", async () => {
    await as(db, parentA, "delete from events where id = $1", [event])
    const { rows } = await db.query("select (select count(*) from event_members) + (select count(*) from event_skips) as n")
    expect(Number((rows[0] as { n: number }).n)).toBe(0)
  })
})

describe("family_settings", () => {
  const upsert = `insert into family_settings (night_mode, night_start, night_end) values ($1, $2, $3)
    on conflict (family_id) do update set night_mode = excluded.night_mode, night_start = excluded.night_start,
      night_end = excluded.night_end
    returning night_mode, night_start::text, night_end::text`

  it("can be saved and changed by parents", async () => {
    expect(await as(db, parentA, upsert, [true, "21:30", "06:30"])).toEqual([{ night_mode: true, night_start: "21:30:00", night_end: "06:30:00" }])
    expect(await as(db, parentA, upsert, [false, "23:00", "07:00"])).toHaveLength(1)
  })

  it("can be read but not changed by the family screen", async () => {
    expect(await as(db, screenA, "select night_mode from family_settings")).toEqual([{ night_mode: false }])
    await expect(as(db, screenA, upsert, [true, "00:00", "00:01"])).rejects.toThrow(RLS_VIOLATION)
    expect(await as(db, screenA, "update family_settings set night_mode = true returning family_id")).toHaveLength(0)
  })

  it("can't be created by a family screen either, when the family has none yet", async () => {
    const screenC = { sub: "user_screen_c", o: { id: "org_c", rol: "member" } }
    await expect(as(db, screenC, "insert into family_settings (night_mode) values (false)")).rejects.toThrow(RLS_VIOLATION)
  })

  it("are separate per family", async () => {
    expect(await as(db, parentB, "select family_id from family_settings")).toHaveLength(0)
    expect(await as(db, parentB, upsert, [true, "22:00", "06:00"])).toHaveLength(1)
  })
})

describe("todo_members migration on existing data", () => {
  it("copies todos.assigned_to into todo_members", async () => {
    const index = migrationFiles.findIndex((f) => f.includes("todo_members"))
    const fresh = await createDatabase(migrationFiles.slice(0, index))
    const emma = (await as<{ id: string }>(fresh, parentA, "insert into family_members (name) values ('Emma') returning id"))[0].id
    await as(fresh, parentA, "insert into todos (title, assigned_to) values ('Assigned', $1), ('Unassigned', null)", [emma])

    await runMigrations(fresh, migrationFiles.slice(index))

    const { rows } = await fresh.query<{ title: string, member_id: string }>(
      "select t.title, tm.member_id from todo_members tm join todos t on t.id = tm.todo_id")
    expect(rows).toEqual([{ title: "Assigned", member_id: emma }])
  })
})
