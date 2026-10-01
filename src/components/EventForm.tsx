import { useState, type FormEvent } from "react";
import MemberAvatar from "./MemberAvatar.tsx";
import type { FamilyMember } from "../lib/familyMembers.ts";
import type { FamilyEvent, FamilyEventInput } from "../lib/events.ts";
import { addDays, fromInputs, shortDayLabel, startOfDay, toDateInput, toTimeInput } from "../lib/dates.ts";

type EventFormProps = {
  members: FamilyMember[]
  event?: FamilyEvent
  // Each returns an error message to show, or null on success.
  onSave: (input: FamilyEventInput) => Promise<string | null>
  onDelete?: () => Promise<string | null>
  onClose: () => void
}

// Add or edit an event in a panel over the dashboard: title, day, time or all day, and who's taking part.
function EventForm({ members, event, onSave, onDelete, onClose }: EventFormProps) {
  const today = startOfDay(new Date())
  const start = event ? new Date(event.starts_at) : null
  const [title, setTitle] = useState(event?.title ?? "")
  const [day, setDay] = useState(toDateInput(start ?? today))
  const [allDay, setAllDay] = useState(event?.all_day ?? false)
  const [startTime, setStartTime] = useState(start && !event?.all_day ? toTimeInput(start) : "17:00")
  const [endTime, setEndTime] = useState(event?.ends_at && !event.all_day ? toTimeInput(new Date(event.ends_at)) : "")
  const [memberIds, setMemberIds] = useState<string[]>(event?.member_ids ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const quickDays = Array.from({ length: 7 }, (_, i) => addDays(today, i))

  function toggleMember(id: string) {
    setMemberIds((current) => (current.includes(id) ? current.filter((m) => m !== id) : [...current, id]))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError("Enter a title")
      return
    }
    const startsAt = fromInputs(day, allDay ? "00:00" : startTime)
    const endsAt = !allDay && endTime ? fromInputs(day, endTime) : null
    if (endsAt && endsAt < startsAt) {
      setError("The end time is before the start time")
      return
    }
    setSaving(true)
    const failure = await onSave({ title: title.trim(), startsAt, endsAt, allDay, memberIds })
    setSaving(false)
    if (failure) {
      setError(failure)
    } else {
      onClose()
    }
  }

  async function remove() {
    if (!onDelete || !window.confirm(`Delete "${event?.title}"?`)) {
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
          <form className="event-form card" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
              <h2>{event ? "Edit event" : "Add event"}</h2>

              <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's happening?"
                  aria-label="Title"
                  maxLength={80}
                  autoFocus={!event}
              />

              <div className="day-chips" role="radiogroup" aria-label="Day">
                  {quickDays.map((d) => {
                    const value = toDateInput(d)
                    return (
                        <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={day === value}
                            className={day === value ? "selected" : ""}
                            onClick={() => setDay(value)}
                        >
                            {value === toDateInput(today) ? "Today" : shortDayLabel(d)}
                        </button>
                    )
                  })}
                  <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label="Other day" />
              </div>

              <label className="all-day">
                  <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
                  All day
              </label>
              {!allDay && (
                  <div className="event-times">
                      <label>From <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required /></label>
                      <label>To <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></label>
                  </div>
              )}

              {members.length > 0 && (
                  <>
                      <p className="muted">Who's taking part?</p>
                      <div className="todo-assignees" role="group" aria-label="Who's taking part">
                          {members.map((member) => (
                              <button
                                  key={member.id}
                                  type="button"
                                  aria-pressed={memberIds.includes(member.id)}
                                  aria-label={member.name}
                                  title={member.name}
                                  className={memberIds.includes(member.id) ? "selected" : ""}
                                  onClick={() => toggleMember(member.id)}
                              >
                                  <MemberAvatar member={member} size={36} />
                              </button>
                          ))}
                      </div>
                  </>
              )}

              {error && <p className="error">{error}</p>}

              <div className="event-form-actions">
                  <button className="primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                  <button type="button" onClick={onClose}>Cancel</button>
                  {onDelete && <button type="button" className="danger" onClick={remove} disabled={saving}>Delete</button>}
              </div>
          </form>
      </div>
  )
}

export default EventForm
