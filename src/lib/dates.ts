// Small local-time date helpers for the week view. All dates are in the screen's own time zone.

const LOCALE = "en-GB" // English labels with 24-hour times and day-month order, e.g. "Fri 3 Oct", "17:30"

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

// "17:30": the value format of <input type="time">.
export function toTimeInput(date: Date) {
  return date.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
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
    return "Today"
  }
  if (diff === 1) {
    return "Tomorrow"
  }
  return date.toLocaleDateString(LOCALE, { weekday: "short", day: "numeric", month: "short" })
}

export function shortDayLabel(date: Date) {
  return date.toLocaleDateString(LOCALE, { weekday: "short", day: "numeric" })
}
