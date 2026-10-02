import { useRef, useState, type FormEvent } from "react";
import FieldIcon from "./FieldIcon.tsx";
import MemberAvatar from "./MemberAvatar.tsx";
import RepeatPicker from "./RepeatPicker.tsx";
import type { FamilyMember } from "../lib/familyMembers.ts";
import type { FamilyEvent, FamilyEventInput } from "../lib/events.ts";
import { currentLocale } from "../i18n/index.ts";
import { addDays, fromInputs, startOfDay, toDateInput, toTimeInput } from "../lib/dates.ts";
import { fitRuleToDay, NO_REPEAT, type RepeatRule } from "../lib/recurrence.ts";
import { useTranslation } from "react-i18next";

type EventFormProps = {
  members: FamilyMember[]
  event?: FamilyEvent
  // Each returns an error message to show, or null on success.
  onSave: (input: FamilyEventInput) => Promise<string | null>
  onDelete?: () => Promise<string | null>
  onClose: () => void
}

// Add or edit an event in a sheet over the dashboard: a title, then Day / Time / Repeat / Who rows,
// and Delete / Cancel / Save at the bottom. For a repeating event the day is the series' first day,
// and saving changes the whole series.
function EventForm({ members, event, onSave, onDelete, onClose }: EventFormProps) {
  const { t } = useTranslation()
  const today = startOfDay(new Date())
  const start = event ? new Date(event.starts_at) : null
  const [title, setTitle] = useState(event?.title ?? "")
  const [day, setDay] = useState(toDateInput(start ?? today))
  const [allDay, setAllDay] = useState(event?.all_day ?? false)
  const [startTime, setStartTime] = useState(start && !event?.all_day ? toTimeInput(start) : "17:00")
  const [endTime, setEndTime] = useState(event?.ends_at && !event.all_day ? toTimeInput(new Date(event.ends_at)) : "")
  const [memberIds, setMemberIds] = useState<string[]>(event?.member_ids ?? [])
  const [rule, setRule] = useState<RepeatRule>(event ? {
    repeat: event.repeat,
    repeat_interval: event.repeat_interval,
    repeat_weekdays: event.repeat_weekdays,
    repeat_week: event.repeat_week,
    repeat_until: event.repeat_until,
  } : NO_REPEAT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const otherDayInput = useRef<HTMLInputElement>(null)

  const stripDays = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  const dayInStrip = stripDays.some((d) => toDateInput(d) === day)

  function changeDay(value: string) {
    setDay(value)
    setRule((current) => fitRuleToDay(current, fromInputs(value)))
  }

  function pickOtherDay() {
    const input = otherDayInput.current
    if (!input) {
      return
    }
    try {
      input.showPicker()
    } catch {
      input.focus()
    }
  }

  function toggleMember(id: string) {
    setMemberIds((current) => (current.includes(id) ? current.filter((m) => m !== id) : [...current, id]))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError(t("event.enterTitle"))
      return
    }
    if (rule.repeat === "weekly" && !rule.repeat_weekdays?.length) {
      setError(t("event.pickRepeatDay"))
      return
    }
    if (rule.repeat && rule.repeat_until && rule.repeat_until < day) {
      setError(t("event.untilBeforeStart"))
      return
    }
    const startsAt = fromInputs(day, allDay ? "00:00" : startTime)
    const endsAt = !allDay && endTime ? fromInputs(day, endTime) : null
    if (endsAt && endsAt < startsAt) {
      setError(t("event.endBeforeStart"))
      return
    }
    setSaving(true)
    const failure = await onSave({ title: title.trim(), startsAt, endsAt, allDay, memberIds, rule })
    setSaving(false)
    if (failure) {
      setError(failure)
    } else {
      onClose()
    }
  }

  async function remove() {
    if (!onDelete || !window.confirm(event?.repeat ? t("event.confirmDeleteSeries", { title: event.title }) : t("event.confirmDelete", { title: event?.title }))) {
      return
    }
    setSaving(true)
    const failure = await onDelete()
    setSaving(false)
    if (failure) {
      setError(failure)
    } else {
      onClose()
    }
  }

  return (
      <div className="overlay" onClick={onClose}>
          <form className="event-sheet" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
              <div className="event-sheet-top">
                  <span className="muted">{event ? (event.repeat ? t("event.editRepeating") : t("event.edit")) : t("event.new")}</span>
                  <button type="button" className="icon-button" onClick={onClose} aria-label={t("common.close")}>
                      <FieldIcon name="x" />
                  </button>
              </div>

              <div className="event-sheet-title">
                  <input
                      value={title}
                      onChange={(e) => { setTitle(e.target.value); setError(null) }}
                      placeholder={t("event.titlePlaceholder")}
                      aria-label={t("event.title")}
                      maxLength={80}
                      autoFocus={!event}
                  />
                  {event?.repeat && <p className="muted">{t("event.seriesNote")}</p>}
              </div>

              <div className="event-fields">
                  <span className="field-label field-label-top"><FieldIcon name="calendar" />{t("event.day")}</span>
                  <div className="day-strip" role="radiogroup" aria-label={t("event.day")}>
                      {stripDays.map((d) => {
                        const value = toDateInput(d)
                        const isToday = value === toDateInput(today)
                        return (
                            <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={day === value}
                                className={`day-tile${day === value ? " selected" : ""}`}
                                onClick={() => changeDay(value)}
                            >
                                <span className="day-tile-name">{isToday ? t("dates.today") : d.toLocaleDateString(currentLocale(), { weekday: "short" })}</span>
                                <span className="day-tile-number">{d.getDate()}</span>
                            </button>
                        )
                      })}
                      <button
                          type="button"
                          role="radio"
                          aria-checked={!dayInStrip}
                          className={`day-tile day-tile-other${dayInStrip ? "" : " selected"}`}
                          onClick={pickOtherDay}
                      >
                          {dayInStrip ? (
                              <>
                                  <span className="day-tile-name">{t("event.otherDay")}</span>
                                  <FieldIcon name="calendarPlus" size={20} />
                              </>
                          ) : (
                              <>
                                  <span className="day-tile-name">{fromInputs(day).toLocaleDateString(currentLocale(), { month: "short" })}</span>
                                  <span className="day-tile-number">{fromInputs(day).getDate()}</span>
                              </>
                          )}
                      </button>
                      <input
                          ref={otherDayInput}
                          className="visually-hidden-input"
                          type="date"
                          value={day}
                          onChange={(e) => e.target.value && changeDay(e.target.value)}
                          aria-label={t("event.otherDayLabel")}
                          tabIndex={-1}
                      />
                  </div>

                  <span className="field-label"><FieldIcon name="clock" />{t("event.time")}</span>
                  <div className="field-row">
                      <div className="segmented" role="radiogroup" aria-label={t("event.timeOrAllDay")}>
                          <button type="button" role="radio" aria-checked={!allDay} className={allDay ? "" : "selected"} onClick={() => setAllDay(false)}>
                              {t("event.setTime")}
                          </button>
                          <button type="button" role="radio" aria-checked={allDay} className={allDay ? "selected" : ""} onClick={() => setAllDay(true)}>
                              {t("week.allDay")}
                          </button>
                      </div>
                      {!allDay && (
                          <>
                              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} aria-label={t("event.from")} required />
                              <span className="muted">{t("event.to")}</span>
                              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} aria-label={t("event.toOptional")} />
                          </>
                      )}
                  </div>

                  <span className="field-label field-label-top"><FieldIcon name="repeat" />{t("repeat.label")}</span>
                  <RepeatPicker day={fromInputs(day)} value={rule} onChange={setRule} />

                  {members.length > 0 && (
                      <>
                          <span className="field-label field-label-top"><FieldIcon name="users" />{t("event.who")}</span>
                          <div className="who-picker" role="group" aria-label={t("event.whoLabel")}>
                              {members.map((member) => {
                                const selected = memberIds.includes(member.id)
                                return (
                                    <button
                                        key={member.id}
                                        type="button"
                                        aria-pressed={selected}
                                        className={`who-option${selected ? " selected" : ""}`}
                                        onClick={() => toggleMember(member.id)}
                                    >
                                        <MemberAvatar member={member} size={40} />
                                        <span>{member.name}</span>
                                    </button>
                                )
                              })}
                          </div>
                      </>
                  )}
              </div>

              {error && <p className="error event-sheet-error">{error}</p>}

              <div className="event-sheet-footer">
                  {onDelete && (
                      <button type="button" className="text-danger-button" onClick={remove} disabled={saving}>
                          <FieldIcon name="trash" size={16} />{event?.repeat ? t("event.deleteSeries") : t("common.delete")}
                      </button>
                  )}
                  <span className="spacer" />
                  <button type="button" onClick={onClose}>{t("common.cancel")}</button>
                  <button className="primary" type="submit" disabled={saving}>{saving ? t("common.saving") : t("common.save")}</button>
              </div>
          </form>
      </div>
  )
}

export default EventForm
