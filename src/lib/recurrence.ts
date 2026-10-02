import i18n, { currentLocale, weekdaysInOrder } from "../i18n/index.ts";
import { addDays, startOfDay, toDateInput, weekdayName } from "./dates.ts";

// Repeat rules for events (see supabase/migrations/20261001200000_repeating_events.sql).
// All matching is done on local dates, so a 17:00 event stays at 17:00 across daylight saving changes.

export type RepeatKind = "weekly" | "monthly_date" | "monthly_weekday"

export type RepeatRule = {
  repeat: RepeatKind | null
  repeat_interval: number
  repeat_weekdays: number[] | null // 0 = Sunday … 6 = Saturday
  repeat_week: number | null // 1–4, or -1 = last
  repeat_until: string | null // last local date, "2026-12-20"
}

export type Occurrence = { startsAt: Date, endsAt: Date | null }

export const NO_REPEAT: RepeatRule = { repeat: null, repeat_interval: 1, repeat_weekdays: null, repeat_week: null, repeat_until: null }

type Repeatable = RepeatRule & { starts_at: string, ends_at: string | null, all_day: boolean }

const DAY_MS = 86_400_000

function daysBetween(a: Date, b: Date) {
  // Rounded, because a day across a daylight saving change is 23 or 25 hours long.
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS)
}

function mondayOf(date: Date) {
  return addDays(startOfDay(date), -((date.getDay() + 6) % 7))
}

function monthsBetween(a: Date, b: Date) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
}

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

// Which week of its month a date falls in: 1–5 (the 1st–7th is week 1).
export function weekOfMonth(date: Date) {
  return Math.ceil(date.getDate() / 7)
}

export function isLastWeekOfMonth(date: Date) {
  return date.getDate() + 7 > daysInMonth(date)
}

// Makes a rule fit a (new) first day: "monthly on the first Saturday" can't stay when the day moves to the 30th,
// so it becomes that day's week of the month (or "last" for the 29th–31st).
export function fitRuleToDay(rule: RepeatRule, day: Date): RepeatRule {
  if (rule.repeat !== "monthly_weekday") {
    return rule
  }
  const week = weekOfMonth(day)
  const fits = rule.repeat_week === -1 ? isLastWeekOfMonth(day) : rule.repeat_week === week
  return fits ? rule : { ...rule, repeat_week: week <= 4 ? week : -1 }
}

// Whether a repeating event occurs on local day `day` (ignoring end date and skips).
function matches(rule: RepeatRule, first: Date, day: Date) {
  const interval = Math.max(1, rule.repeat_interval)
  switch (rule.repeat) {
    case "weekly":
      return (rule.repeat_weekdays ?? []).includes(day.getDay())
          && Math.round(daysBetween(mondayOf(first), mondayOf(day)) / 7) % interval === 0
    case "monthly_date":
      // A series on the 31st skips months without one, like most calendars.
      return day.getDate() === first.getDate() && monthsBetween(first, day) % interval === 0
    case "monthly_weekday":
      return day.getDay() === first.getDay()
          && (rule.repeat_week === -1 ? isLastWeekOfMonth(day) : weekOfMonth(day) === rule.repeat_week)
          && monthsBetween(first, day) % interval === 0
    default:
      return false
  }
}

// Occurrences of an event on the `days` local days starting at `from`, leaving out skipped dates.
export function occurrencesIn(event: Repeatable, from: Date, days: number, skipDates: Set<string> = new Set()): Occurrence[] {
  const first = new Date(event.starts_at)
  const firstDay = startOfDay(first)
  const duration = event.ends_at ? new Date(event.ends_at).getTime() - first.getTime() : null
  const result: Occurrence[] = []

  for (let i = 0; i < days; i++) {
    const day = addDays(startOfDay(from), i)
    const key = toDateInput(day)
    const occurs = event.repeat
        ? day >= firstDay && (!event.repeat_until || key <= event.repeat_until) && matches(event, first, day)
        : key === toDateInput(firstDay)
    if (!occurs || skipDates.has(key)) {
      continue
    }
    const startsAt = event.all_day
        ? day
        : new Date(day.getFullYear(), day.getMonth(), day.getDate(), first.getHours(), first.getMinutes())
    result.push({ startsAt, endsAt: duration === null ? null : new Date(startsAt.getTime() + duration) })
  }
  return result
}

// Daily and "every weekday" are weekly rules on all 7 days / Monday–Friday.
export const ALL_DAYS = [1, 2, 3, 4, 5, 6, 0]
export const WORKWEEK = [1, 2, 3, 4, 5]

function sameDays(days: number[], expected: number[]) {
  return days.length === expected.length && expected.every((d) => days.includes(d))
}

function isWorkweek(days: number[]) {
  return sameDays(days, WORKWEEK)
}

// Which repeat preset a weekly rule matches: "daily", "weekdays", or plain "weekly".
export function weeklyPreset(rule: RepeatRule): "daily" | "weekdays" | "weekly" {
  const days = rule.repeat_weekdays ?? []
  if (rule.repeat_interval === 1 && sameDays(days, ALL_DAYS)) {
    return "daily"
  }
  if (rule.repeat_interval === 1 && isWorkweek(days)) {
    return "weekdays"
  }
  return "weekly"
}

// "Every Tue, Thu", "Every 2 weeks on Mon", "Monthly on the 15th", "Every 3 months on the last Friday"…
// in the current language (see the "repeat" texts in i18n/locales).
export function describeRepeat(rule: RepeatRule, firstStart: Date) {
  const t = i18n.t.bind(i18n)
  if (!rule.repeat) {
    return t("repeat.none")
  }
  const count = Math.max(1, rule.repeat_interval)
  let text: string
  if (rule.repeat === "weekly") {
    const order = weekdaysInOrder()
    const days = [...(rule.repeat_weekdays ?? [])].sort((a, b) => order.indexOf(a) - order.indexOf(b))
    const kind = days.length === 7 ? "allDays" : isWorkweek(days) ? "weekdays" : "days"
    const names = days.map((d) => weekdayName(d, "short")).join(", ")
    text = t(count === 1 ? `repeat.weekly.${kind}` : `repeat.weekly.${kind}Every`, { count, days: names })
  } else {
    const on = rule.repeat === "monthly_date"
        ? t("repeat.monthly.onDate", { day: t("repeat.dayOfMonth", { count: firstStart.getDate(), ordinal: true }) })
        : t("repeat.monthly.onWeekday", {
          week: t(`repeat.week.${rule.repeat_week === -1 ? "last" : rule.repeat_week ?? 1}`),
          weekday: weekdayName(firstStart.getDay(), "long"),
        })
    text = t(count === 1 ? "repeat.monthly.monthly" : "repeat.monthly.every", { count, on })
  }
  if (rule.repeat_until) {
    const [y, m, d] = rule.repeat_until.split("-").map(Number)
    const until = new Date(y, m - 1, d).toLocaleDateString(currentLocale(), { day: "numeric", month: "short", year: "numeric" })
    text = t("repeat.until", { text, date: until })
  }
  return text
}
