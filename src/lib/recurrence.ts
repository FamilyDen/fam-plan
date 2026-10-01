import { addDays, startOfDay, toDateInput } from "./dates.ts";

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

const LOCALE = "en-GB"
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

const ORDINALS: Record<number, string> = { 1: "first", 2: "second", 3: "third", 4: "fourth", [-1]: "last" }

function dayOfMonthLabel(n: number) {
  const suffix = n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"
  return `${n}${suffix}`
}

function weekdayName(weekday: number, style: "short" | "long") {
  // 4 Jan 2026 is a Sunday, so 4 + weekday is that weekday.
  return new Date(2026, 0, 4 + weekday).toLocaleDateString(LOCALE, { weekday: style })
}

// "Every Tue, Thu", "Every 2 weeks on Mon", "Monthly on the 15th", "Every 3 months on the last Friday"…
export function describeRepeat(rule: RepeatRule, firstStart: Date) {
  if (!rule.repeat) {
    return "Doesn't repeat"
  }
  const n = Math.max(1, rule.repeat_interval)
  let text: string
  if (rule.repeat === "weekly") {
    const days = [...(rule.repeat_weekdays ?? [])].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)) // Monday first
    const names = days.length === 7 ? "day" : days.map((d) => weekdayName(d, "short")).join(", ")
    text = n === 1 ? `Every ${names}` : `Every ${n} weeks on ${names}`
  } else {
    const on = rule.repeat === "monthly_date"
        ? `the ${dayOfMonthLabel(firstStart.getDate())}`
        : `the ${ORDINALS[rule.repeat_week ?? 1]} ${weekdayName(firstStart.getDay(), "long")}`
    text = n === 1 ? `Monthly on ${on}` : `Every ${n} months on ${on}`
  }
  if (rule.repeat_until) {
    const [y, m, d] = rule.repeat_until.split("-").map(Number)
    text += ` until ${new Date(y, m - 1, d).toLocaleDateString(LOCALE, { day: "numeric", month: "short", year: "numeric" })}`
  }
  return text
}
