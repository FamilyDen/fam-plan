import { describe, expect, it } from "vitest";
import { isNight } from "./display.ts";

const at = (hour: number, minute = 0) => new Date(2026, 9, 2, hour, minute)

describe("isNight", () => {
  it("handles a window crossing midnight (22:00–06:00)", () => {
    expect(isNight(at(21, 59), "22:00", "06:00")).toBe(false)
    expect(isNight(at(22, 0), "22:00", "06:00")).toBe(true) // start is included
    expect(isNight(at(0, 30), "22:00", "06:00")).toBe(true)
    expect(isNight(at(5, 59), "22:00", "06:00")).toBe(true)
    expect(isNight(at(6, 0), "22:00", "06:00")).toBe(false) // end is excluded
    expect(isNight(at(12, 0), "22:00", "06:00")).toBe(false)
  })

  it("handles a window within one day (13:00–15:00)", () => {
    expect(isNight(at(12, 59), "13:00", "15:00")).toBe(false)
    expect(isNight(at(13, 0), "13:00", "15:00")).toBe(true)
    expect(isNight(at(15, 0), "13:00", "15:00")).toBe(false)
  })

  it("handles half hours", () => {
    expect(isNight(at(21, 30), "21:30", "06:30")).toBe(true)
    expect(isNight(at(6, 15), "21:30", "06:30")).toBe(true)
  })

  it("treats equal start and end as no night at all", () => {
    expect(isNight(at(3, 0), "22:00", "22:00")).toBe(false)
  })
})
