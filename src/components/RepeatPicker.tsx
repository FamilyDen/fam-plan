import { describeRepeat, isLastWeekOfMonth, NO_REPEAT, weekOfMonth, type RepeatRule } from "../lib/recurrence.ts";

// Monday first, as on Danish calendars.
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0]
const WEEK_INTERVALS = [1, 2, 3, 4]
const MONTH_INTERVALS = [1, 2, 3, 6, 12]

type Option = { value: string, label: string, rule: (current: RepeatRule) => RepeatRule }

// The repeat choices that make sense for the event's (first) day, e.g. "Monthly on the 3rd" and
// "Monthly on the first Saturday", plus "last Saturday" when the day is in the last week of its month.
function optionsFor(day: Date): Option[] {
  const describe = (rule: RepeatRule) => describeRepeat({ ...rule, repeat_interval: 1, repeat_until: null }, day)
  const options: Option[] = [
    { value: "none", label: "Doesn't repeat", rule: () => NO_REPEAT },
    {
      value: "weekly",
      label: "Weekly",
      rule: (current) => ({
        ...current,
        repeat: "weekly",
        repeat_weekdays: current.repeat === "weekly" && current.repeat_weekdays?.length ? current.repeat_weekdays : [day.getDay()],
      }),
    },
    {
      value: "monthly_date",
      label: describe({ ...NO_REPEAT, repeat: "monthly_date" }),
      rule: (current) => ({ ...current, repeat: "monthly_date" }),
    },
  ]
  const week = weekOfMonth(day)
  if (week <= 4) {
    const rule = { ...NO_REPEAT, repeat: "monthly_weekday" as const, repeat_week: week }
    options.push({ value: `monthly_weekday:${week}`, label: describe(rule), rule: (current) => ({ ...current, ...rule, repeat_interval: current.repeat_interval, repeat_until: current.repeat_until }) })
  }
  if (isLastWeekOfMonth(day)) {
    const rule = { ...NO_REPEAT, repeat: "monthly_weekday" as const, repeat_week: -1 }
    options.push({ value: "monthly_weekday:-1", label: describe(rule), rule: (current) => ({ ...current, ...rule, repeat_interval: current.repeat_interval, repeat_until: current.repeat_until }) })
  }
  return options
}

function valueOf(rule: RepeatRule) {
  return rule.repeat === "monthly_weekday" ? `monthly_weekday:${rule.repeat_week}` : rule.repeat ?? "none"
}

type RepeatPickerProps = {
  day: Date // the event's first day
  value: RepeatRule
  onChange: (rule: RepeatRule) => void
}

function RepeatPicker({ day, value, onChange }: RepeatPickerProps) {
  const options = optionsFor(day)
  const weekly = value.repeat === "weekly"
  const intervals = weekly ? WEEK_INTERVALS : MONTH_INTERVALS
  const unit = weekly ? "week" : "month"

  function toggleWeekday(weekday: number) {
    const current = value.repeat_weekdays ?? []
    const next = current.includes(weekday) ? current.filter((d) => d !== weekday) : [...current, weekday]
    onChange({ ...value, repeat_weekdays: next })
  }

  return (
      <div className="repeat-picker">
          <label className="repeat-row">
              Repeat
              <select
                  value={valueOf(value)}
                  onChange={(e) => onChange(options.find((o) => o.value === e.target.value)!.rule(value))}
              >
                  {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
          </label>

          {weekly && (
              <div className="day-chips" role="group" aria-label="On these days">
                  {WEEKDAYS.map((weekday) => (
                      <button
                          key={weekday}
                          type="button"
                          aria-pressed={value.repeat_weekdays?.includes(weekday) ?? false}
                          className={value.repeat_weekdays?.includes(weekday) ? "selected" : ""}
                          onClick={() => toggleWeekday(weekday)}
                      >
                          {new Date(2026, 0, 4 + weekday).toLocaleDateString("en-GB", { weekday: "short" })}
                      </button>
                  ))}
              </div>
          )}

          {value.repeat && (
              <div className="repeat-row">
                  <select
                      value={value.repeat_interval}
                      onChange={(e) => onChange({ ...value, repeat_interval: Number(e.target.value) })}
                      aria-label="How often"
                  >
                      {intervals.map((n) => <option key={n} value={n}>{n === 1 ? `Every ${unit}` : `Every ${n} ${unit}s`}</option>)}
                  </select>
                  <label className="repeat-row">
                      Until
                      <input
                          type="date"
                          value={value.repeat_until ?? ""}
                          onChange={(e) => onChange({ ...value, repeat_until: e.target.value || null })}
                          aria-label="Repeat until (optional)"
                      />
                  </label>
                  {value.repeat_until && (
                      <button type="button" className="link-button" onClick={() => onChange({ ...value, repeat_until: null })}>
                          No end date
                      </button>
                  )}
              </div>
          )}

          {value.repeat && <p className="muted repeat-summary">↻ {describeRepeat(value, day)}</p>}
      </div>
  )
}

export default RepeatPicker
