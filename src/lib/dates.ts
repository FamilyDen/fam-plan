import i18n, { currentLocale } from "../i18n/index.ts";

// Small local-time date helpers for the week view. All dates are in the screen's own time zone.
// Labels follow the current language's format (e.g. "Fri 3 Oct" / "fre. 3. okt."); input values don't.

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

// "2026-10-03": the value format of <input type="date"> and a stable key for grouping by day.
export function toDateInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// "17:30": the value format of <input type="time"> (the same in every language).
export function toTimeInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// A time for display in the current language's format, e.g. "17:30" (English) or "17.30" (Danish).
export function formatTime(date: Date) {
  return date.toLocaleTimeString(currentLocale(), { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
}

// A long date for display, e.g. "Friday 2 October" / "fredag den 2. oktober".
export function formatLongDate(date: Date) {
  return date.toLocaleDateString(currentLocale(), { weekday: "long", day: "numeric", month: "long" })
}

// Local date ("2026-10-03") plus optional local time ("17:30") as a Date.
export function fromInputs(day: string, time = "00:00") {
  const [y, m, d] = day.split("-").map(Number)
  const [h, min] = time.split(":").map(Number)
  return new Date(y, m - 1, d, h, min)
}

export function dayLabel(date: Date, today = startOfDay(new Date())) {
  const diff = Math.round((startOfDay(date).getTime() - today.getTime()) / 86_400_000)
  if (diff === 0) {
    return i18n.t("dates.today")
  }
  if (diff === 1) {
    return i18n.t("dates.tomorrow")
  }
  return date.toLocaleDateString(currentLocale(), { weekday: "short", day: "numeric", month: "short" })
}

export function shortDayLabel(date: Date) {
  return date.toLocaleDateString(currentLocale(), { weekday: "short", day: "numeric" })
}

// A weekday's name (0 = Sunday … 6 = Saturday), e.g. "Tue" / "tirs." or "Tuesday" / "tirsdag".
export function weekdayName(weekday: number, style: "short" | "long") {
  // 4 Jan 2026 is a Sunday, so 4 + weekday is that weekday.
  return new Date(2026, 0, 4 + weekday).toLocaleDateString(currentLocale(), { weekday: style })
}
