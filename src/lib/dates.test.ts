import { afterEach, describe, expect, it } from "vitest";
import i18n from "../i18n/index.ts";
import { addDays, dayLabel, formatTime, fromInputs, shortDayLabel, startOfDay, toDateInput, toTimeInput } from "./dates.ts";

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

describe("date labels in Danish", () => {
  afterEach(() => i18n.changeLanguage("en"))

  it("use Danish words and formats, while form values stay the same", async () => {
    await i18n.changeLanguage("da")
    expect(dayLabel(today, today)).toBe("I dag")
    expect(dayLabel(addDays(today, 1), today)).toBe("I morgen")
    expect(dayLabel(addDays(today, 2), today)).toBe("man. 26. okt.")
    const evening = fromInputs("2026-10-26", "17:30")
    expect(formatTime(evening)).toBe("17.30")
    expect(toTimeInput(evening)).toBe("17:30") // <input type="time"> needs this in every language
  })
})
