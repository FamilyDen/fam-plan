import { describe, expect, it } from "vitest";
import { toDateInput, toTimeInput } from "./dates.ts";
import { ALL_DAYS, describeRepeat, fitRuleToDay, NO_REPEAT, occurrencesIn, weeklyPreset, WORKWEEK, type RepeatRule } from "./recurrence.ts";

type TestEvent = RepeatRule & { starts_at: string, ends_at: string | null, all_day: boolean }

const event = (overrides: Partial<TestEvent> & { starts_at: string }): TestEvent => ({
  ...NO_REPEAT,
  ends_at: null,
  all_day: false,
  ...overrides,
})

const at = (month: number, day: number, hour = 0, minute = 0, year = 2026) => new Date(year, month - 1, day, hour, minute)

// "2026-10-20 17:00-18:30" for each occurrence in the window.
function dates(e: TestEvent, from: Date, days: number, skips: string[] = []) {
  return occurrencesIn(e, from, days, new Set(skips)).map((o) =>
    `${toDateInput(o.startsAt)} ${e.all_day ? "all-day" : toTimeInput(o.startsAt)}${o.endsAt ? `-${toTimeInput(o.endsAt)}` : ""}`)
}
const days = (e: TestEvent, from: Date, n: number) => dates(e, from, n).map((d) => d.slice(0, 10))

const football = event({
  starts_at: at(10, 6, 17).toISOString(),
  ends_at: at(10, 6, 18, 30).toISOString(),
  repeat: "weekly",
  repeat_weekdays: [2, 4],
})

describe("weekly events", () => {
  it("keep their local time across the October daylight saving change", () => {
    expect(dates(football, at(10, 19), 14)).toEqual([
      "2026-10-20 17:00-18:30",
      "2026-10-22 17:00-18:30",
      "2026-10-27 17:00-18:30",
      "2026-10-29 17:00-18:30",
    ])
  })

  it("don't occur before the series starts", () => {
    expect(dates(football, at(10, 1), 5)).toEqual([])
  })

  it("leave out skipped dates", () => {
    expect(dates(football, at(10, 12), 7, ["2026-10-13"])).toEqual(["2026-10-15 17:00-18:30"])
  })

  it("include the end date", () => {
    expect(dates({ ...football, repeat_until: "2026-10-13" }, at(10, 12), 7)).toEqual(["2026-10-13 17:00-18:30"])
  })

  it("repeat every 2 weeks", () => {
    const bins = event({ starts_at: at(10, 5, 7).toISOString(), repeat: "weekly", repeat_weekdays: [1], repeat_interval: 2 })
    expect(dates(bins, at(10, 1), 35)).toEqual(["2026-10-05 07:00", "2026-10-19 07:00", "2026-11-02 07:00"])
  })

  it("count every-2-weeks from the week the series starts in", () => {
    const mf = event({ starts_at: at(10, 7, 9).toISOString(), repeat: "weekly", repeat_weekdays: [1, 5], repeat_interval: 2 })
    expect(dates(mf, at(10, 5), 21)).toEqual(["2026-10-09 09:00", "2026-10-19 09:00", "2026-10-23 09:00"])
  })

  it("support every weekday and every day", () => {
    const school = event({ starts_at: at(10, 1, 8).toISOString(), repeat: "weekly", repeat_weekdays: WORKWEEK })
    expect(days(school, at(10, 1), 7)).toEqual(["2026-10-01", "2026-10-02", "2026-10-05", "2026-10-06", "2026-10-07"])
    const daily = event({ starts_at: at(10, 1, 20).toISOString(), repeat: "weekly", repeat_weekdays: ALL_DAYS })
    expect(days(daily, at(10, 1), 7)).toHaveLength(7)
  })
})

describe("monthly events", () => {
  it("on the 31st skip months without one", () => {
    const rent = event({ starts_at: at(1, 31).toISOString(), all_day: true, repeat: "monthly_date" })
    expect(days(rent, at(2, 1), 120)).toEqual(["2026-03-31", "2026-05-31"])
  })

  it("repeat every 2 months on the same date", () => {
    const hair = event({ starts_at: at(10, 15, 10).toISOString(), repeat: "monthly_date", repeat_interval: 2 })
    expect(days(hair, at(10, 1), 100)).toEqual(["2026-10-15", "2026-12-15"])
  })

  it("land on the first Saturday", () => {
    const market = event({ starts_at: at(10, 3, 10).toISOString(), repeat: "monthly_weekday", repeat_week: 1 })
    expect(days(market, at(10, 1), 70)).toEqual(["2026-10-03", "2026-11-07", "2026-12-05"])
  })

  it("land on the last Friday", () => {
    const pizza = event({ starts_at: at(10, 30, 18).toISOString(), repeat: "monthly_weekday", repeat_week: -1 })
    expect(days(pizza, at(10, 1), 125)).toEqual(["2026-10-30", "2026-11-27", "2026-12-25", "2027-01-29"])
  })
})

describe("one-off events", () => {
  it("occur once", () => {
    expect(dates(event({ starts_at: at(10, 7, 8, 30).toISOString() }), at(10, 5), 7)).toEqual(["2026-10-07 08:30"])
  })
})

describe("describeRepeat", () => {
  const first = at(10, 30)

  it("describes weekly rules", () => {
    expect(describeRepeat(football, first)).toBe("Every Tue, Thu")
    expect(describeRepeat({ ...NO_REPEAT, repeat: "weekly", repeat_weekdays: ALL_DAYS }, first)).toBe("Every day")
    expect(describeRepeat({ ...NO_REPEAT, repeat: "weekly", repeat_weekdays: WORKWEEK }, first)).toBe("Every weekday")
    expect(describeRepeat({ ...NO_REPEAT, repeat: "weekly", repeat_weekdays: WORKWEEK, repeat_interval: 2 }, first)).toBe("Every 2 weeks on weekdays")
    expect(describeRepeat({ ...NO_REPEAT, repeat: "weekly", repeat_weekdays: [1], repeat_interval: 2 }, first)).toBe("Every 2 weeks on Mon")
  })

  it("describes monthly rules and end dates", () => {
    expect(describeRepeat({ ...NO_REPEAT, repeat: "monthly_date", repeat_interval: 2 }, at(10, 15))).toBe("Every 2 months on the 15th")
    expect(describeRepeat({ ...NO_REPEAT, repeat: "monthly_weekday", repeat_week: -1, repeat_until: "2027-06-30" }, first))
        .toBe("Monthly on the last Friday until 30 Jun 2027")
  })
})

describe("weeklyPreset", () => {
  it("recognises daily and every-weekday rules", () => {
    expect(weeklyPreset({ ...NO_REPEAT, repeat: "weekly", repeat_weekdays: ALL_DAYS })).toBe("daily")
    expect(weeklyPreset({ ...NO_REPEAT, repeat: "weekly", repeat_weekdays: [5, 4, 3, 2, 1] })).toBe("weekdays")
    expect(weeklyPreset({ ...NO_REPEAT, repeat: "weekly", repeat_weekdays: WORKWEEK, repeat_interval: 2 })).toBe("weekly")
    expect(weeklyPreset(football)).toBe("weekly")
  })
})

describe("fitRuleToDay", () => {
  const firstSaturday: RepeatRule = { ...NO_REPEAT, repeat: "monthly_weekday", repeat_week: 1 }

  it("keeps or adjusts the week of the month when the first day changes", () => {
    expect(fitRuleToDay(firstSaturday, at(10, 3)).repeat_week).toBe(1)
    expect(fitRuleToDay(firstSaturday, at(10, 31)).repeat_week).toBe(-1)
    expect(fitRuleToDay(firstSaturday, at(10, 17)).repeat_week).toBe(3)
    expect(fitRuleToDay({ ...firstSaturday, repeat_week: -1 }, at(10, 25)).repeat_week).toBe(-1)
  })

  it("leaves weekly rules alone", () => {
    expect(fitRuleToDay(football, at(10, 31))).toBe(football)
  })
})
