import { useState } from "react";
import i18n, { weekdaysInOrder } from "../i18n/index.ts";
import { toDateInput, weekdayName } from "../lib/dates.ts";
import { ALL_DAYS, describeRepeat, isLastWeekOfMonth, NO_REPEAT, weekOfMonth, weeklyPreset, WORKWEEK, type RepeatRule } from "../lib/recurrence.ts";
import { useTranslation } from "react-i18next";

const WEEK_INTERVALS = [1, 2, 3, 4]
const MONTH_INTERVALS = [1, 2, 3, 6, 12]

type Option = { value: string, label: string, rule: (current: RepeatRule) => RepeatRule }

// The repeat choices that make sense for the event's (first) day, e.g. "Monthly on the 3rd" and
// "Monthly on the first Saturday", plus "last Saturday" when the day is in the last week of its month.
function optionsFor(day: Date): Option[] {
  const describe = (rule: RepeatRule) => describeRepeat({ ...rule, repeat_interval: 1, repeat_until: null }, day)
  const options: Option[] = [
    { value: "none", label: i18n.t("repeat.none"), rule: () => NO_REPEAT },
    // Daily and weekdays are stored as weekly rules every week.
    {
      value: "daily",
      label: i18n.t("repeat.daily"),
      rule: (current) => ({ ...current, repeat: "weekly", repeat_weekdays: ALL_DAYS, repeat_interval: 1 }),
    },
    {
      value: "weekdays",
      label: i18n.t("repeat.everyWeekdayOption"),
      rule: (current) => ({ ...current, repeat: "weekly", repeat_weekdays: WORKWEEK, repeat_interval: 1 }),
    },
    {
      value: "weekly",
      label: i18n.t("repeat.weeklyOption"),
      rule: (current) => ({
        ...current,
        repeat: "weekly",
        repeat_weekdays: current.repeat === "weekly" && weeklyPreset(current) === "weekly" && current.repeat_weekdays?.length
            ? current.repeat_weekdays
            : [day.getDay()],
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
  if (rule.repeat === "weekly") {
    return weeklyPreset(rule)
  }
  return rule.repeat === "monthly_weekday" ? `monthly_weekday:${rule.repeat_week}` : rule.repeat ?? "none"
}

type RepeatPickerProps = {
  day: Date // the event's first day
  value: RepeatRule
  onChange: (rule: RepeatRule) => void
}

function RepeatPicker({ day, value, onChange }: RepeatPickerProps) {
  const { t } = useTranslation()
  const options = optionsFor(day)
  // The chosen menu option, kept separately so that ticking Mon–Fri in "Weekly" doesn't flip the menu
  // to "Every weekday" mid-tap. Derived from the saved rule when the form opens.
  const [choice, setChoice] = useState(() => valueOf(value))
  const selected = value.repeat ? choice : "none"
  const weekly = value.repeat === "weekly"
  const preset = selected === "daily" || selected === "weekdays"
  const intervals = weekly ? WEEK_INTERVALS : MONTH_INTERVALS
  const unit = weekly ? "week" : "month"

  function choose(optionValue: string) {
    setChoice(optionValue)
    onChange(options.find((o) => o.value === optionValue)!.rule(value))
  }

  function toggleWeekday(weekday: number) {
    const current = value.repeat_weekdays ?? []
    const next = current.includes(weekday) ? current.filter((d) => d !== weekday) : [...current, weekday]
    onChange({ ...value, repeat_weekdays: next })
  }

  return (
      <div className="repeat-picker">
          <div className="field-row">
              <select
                  value={options.some((o) => o.value === selected) ? selected : valueOf(value)}
                  onChange={(e) => choose(e.target.value)}
                  aria-label={t("repeat.label")}
              >
                  {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {value.repeat && !preset && (
                  <select
                      value={value.repeat_interval}
                      onChange={(e) => onChange({ ...value, repeat_interval: Number(e.target.value) })}
                      aria-label={t("repeat.howOften")}
                  >
                      {intervals.map((n) => <option key={n} value={n}>{t(`repeat.interval.${unit}`, { count: n })}</option>)}
                  </select>
              )}
          </div>

          {weekly && !preset && (
              <div className="day-chips" role="group" aria-label={t("repeat.onDays")}>
                  {weekdaysInOrder().map((weekday) => (
                      <button
                          key={weekday}
                          type="button"
                          aria-pressed={value.repeat_weekdays?.includes(weekday) ?? false}
                          className={value.repeat_weekdays?.includes(weekday) ? "selected" : ""}
                          onClick={() => toggleWeekday(weekday)}
                      >
                          {weekdayName(weekday, "short")}
                      </button>
                  ))}
              </div>
          )}

          {value.repeat && (
              <div className="field-row">
                  <span className="muted">{t("repeat.untilLabel")}</span>
                  <input
                      type="date"
                      value={value.repeat_until ?? ""}
                      min={toDateInput(day)}
                      onChange={(e) => onChange({ ...value, repeat_until: e.target.value || null })}
                      aria-label={t("repeat.untilOptional")}
                  />
                  {value.repeat_until
                      ? <button type="button" className="link-button" onClick={() => onChange({ ...value, repeat_until: null })}>{t("repeat.noEnd")}</button>
                      : <span className="muted">{t("repeat.optional")}</span>}
              </div>
          )}

          {value.repeat && <p className="muted repeat-summary">{describeRepeat(value, day)}</p>}
      </div>
  )
}

export default RepeatPicker
