import { describe, expect, it } from "vitest";
import { addDays, dayLabel, fromInputs, shortDayLabel, startOfDay, toDateInput, toTimeInput } from "./dates.ts";

// Saturday 24 October 2026, the day before daylight saving time ends in Denmark (25 Oct 03:00 → 02:00).
const saturday = new Date(2026, 9, 24, 15, 0)
const today = startOfDay(saturday)

describe("date helpers across the daylight saving change", () => {
  it("step through local days, each starting at midnight", () => {
    const week = Array.from({ length: 7 }, (_, i) => addDays(today, i))
    expect(week.map(toDateInput)).toEqual(["2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"])
    expect(week.every((d) => d.getHours() === 0)).toBe(true)
  })

  it("label today, tomorrow and later days", () => {
    expect(dayLabel(today, today)).toBe("Today")
    expect(dayLabel(addDays(today, 1), today)).toBe("Tomorrow")
    expect(dayLabel(addDays(today, 2), today)).toBe("Mon 26 Oct")
    expect(shortDayLabel(addDays(today, 2))).toBe("Mon 26")
  })

  it("turn form inputs into the right moment on both sides of the change", () => {
    const after = fromInputs("2026-10-26", "17:30")
    expect(toDateInput(after)).toBe("2026-10-26")
    expect(toTimeInput(after)).toBe("17:30")
    expect(after.toISOString()).toBe("2026-10-26T16:30:00.000Z") // winter time, UTC+1
    expect(fromInputs("2026-10-24", "17:30").toISOString()).toBe("2026-10-24T15:30:00.000Z") // summer time, UTC+2
  })
})
