import { describe, expect, it } from "vitest";
import { choresFor, isDone, startOfWeek, starsByDay, starsFor, type Chore, type ChoreCompletion } from "./chores.ts";
import { toDateInput } from "./dates.ts";

const chore = (id: string, weekdays: number[], member_ids: string[], stars = 1): Chore => ({ id, title: id, stars, weekdays, member_ids })

const chores = [
  chore("bed", [0, 1, 2, 3, 4, 5, 6], ["lærke", "malte"]),
  chore("dishwasher", [1, 2, 3, 4, 5], ["lærke"], 2),
  chore("room", [6], ["victor"], 3),
]

// Monday 5 – Sunday 11 October 2026.
const monday = new Date(2026, 9, 5)
const saturday = new Date(2026, 9, 10)

describe("startOfWeek", () => {
  it("finds Monday for weeks starting on Monday", () => {
    expect(toDateInput(startOfWeek(new Date(2026, 9, 8, 15, 30), 1))).toBe("2026-10-05")
    expect(toDateInput(startOfWeek(monday, 1))).toBe("2026-10-05")
    expect(toDateInput(startOfWeek(new Date(2026, 9, 11), 1))).toBe("2026-10-05") // Sunday belongs to the week before
  })

  it("finds Sunday for weeks starting on Sunday", () => {
    expect(toDateInput(startOfWeek(new Date(2026, 9, 8), 0))).toBe("2026-10-04")
    expect(toDateInput(startOfWeek(new Date(2026, 9, 11), 0))).toBe("2026-10-11")
  })
})

describe("choresFor", () => {
  it("picks a member's chores for that weekday", () => {
    expect(choresFor(chores, "lærke", monday).map((c) => c.id)).toEqual(["bed", "dishwasher"])
    expect(choresFor(chores, "lærke", saturday).map((c) => c.id)).toEqual(["bed"])
    expect(choresFor(chores, "victor", monday)).toEqual([])
    expect(choresFor(chores, "victor", saturday).map((c) => c.id)).toEqual(["room"])
  })
})

describe("stars", () => {
  const completions: ChoreCompletion[] = [
    { chore_id: "bed", member_id: "lærke", done_on: "2026-10-05", stars: 1 },
    { chore_id: "dishwasher", member_id: "lærke", done_on: "2026-10-05", stars: 2 },
    { chore_id: "bed", member_id: "lærke", done_on: "2026-10-07", stars: 1 },
    { chore_id: "bed", member_id: "malte", done_on: "2026-10-05", stars: 1 },
  ]

  it("knows what is done on a day", () => {
    expect(isDone(completions, "bed", "lærke", monday)).toBe(true)
    expect(isDone(completions, "bed", "lærke", new Date(2026, 9, 6))).toBe(false)
    expect(isDone(completions, "dishwasher", "malte", monday)).toBe(false)
  })

  it("adds up a member's stars, in total and per day", () => {
    expect(starsFor(completions, "lærke")).toBe(4)
    expect(starsFor(completions, "malte")).toBe(1)
    expect(starsFor(completions, "victor")).toBe(0)
    expect(starsByDay(completions, "lærke", monday)).toEqual([3, 0, 1, 0, 0, 0, 0])
  })
})
