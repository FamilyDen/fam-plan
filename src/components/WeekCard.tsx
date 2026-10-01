import { useEffect, useState } from "react";
import EventForm from "./EventForm.tsx";
import MemberAvatar from "./MemberAvatar.tsx";
import type { FamilyMember } from "../lib/familyMembers.ts";
import { useEvents, type EventOccurrence, type FamilyEvent, type FamilyEventInput } from "../lib/events.ts";
import { addDays, dayLabel, startOfDay, toDateInput, toTimeInput } from "../lib/dates.ts";
import { describeRepeat } from "../lib/recurrence.ts";
import { useIsFamilyAdmin } from "../lib/kiosk.ts";

const DAYS = 7

// The family's events for today and the next 6 days, grouped by day, with repeating events on each of
// their dates. Parents can add, edit and delete events (and skip a date of a repeating one); everyone
// else (including the kiosk) sees them read-only.
function WeekCard({ members }: { members: FamilyMember[] }) {
  const today = useToday()
  const isFamilyAdmin = useIsFamilyAdmin()
  const { occurrences, loading, error, add, update, remove, skip } = useEvents(today, addDays(today, DAYS))
  const [editing, setEditing] = useState<FamilyEvent | "new" | null>(null)
  const [choosing, setChoosing] = useState<EventOccurrence | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const membersById = new Map(members.map((m) => [m.id, m]))
  const days = Array.from({ length: DAYS }, (_, i) => addDays(today, i))
      .map((day) => ({ day, occurrences: occurrences.filter((o) => toDateInput(o.startsAt) === toDateInput(day)) }))
      .filter((d) => d.occurrences.length > 0)

  // Tells the parent where an event went when its (first) date is outside the visible week.
  async function save(input: FamilyEventInput, id?: string) {
    const failure = id ? await update(id, input) : await add(input)
    if (!failure) {
      const outside = input.startsAt >= addDays(today, DAYS) || (!input.rule.repeat && input.startsAt < today)
      setNotice(outside ? `Saved, starting ${dayLabel(input.startsAt, today)}. It will show here in that week.` : null)
    }
    return failure
  }

  function open(occurrence: EventOccurrence) {
    setNotice(null)
    if (occurrence.event.repeat) {
      setChoosing(occurrence)
    } else {
      setEditing(occurrence.event)
    }
  }

  async function skipDate(occurrence: EventOccurrence) {
    setChoosing(null)
    setNotice(await skip(occurrence.event.id, toDateInput(occurrence.startsAt)))
  }

  return (
      <section className="panel week-card">
          <div className="panel-head">
              <h2>This week</h2>
              {isFamilyAdmin && !loading && !error && (
                  <button className="panel-action" onClick={() => { setNotice(null); setEditing("new") }}>+ Add event</button>
              )}
          </div>
          {error && <p className="error">{error}</p>}
          {loading && !error && <p className="muted">Loading…</p>}

          {!loading && !error && (
              <>
                  {days.length === 0 && <p className="muted empty-note">Nothing planned this week.</p>}
                  {days.map(({ day, occurrences }) => (
                      <div key={toDateInput(day)} className="week-day">
                          <h3>{dayLabel(day, today)}</h3>
                          <ul>
                              {occurrences.map((occurrence) => (
                                  <li key={occurrence.key}>
                                      <button
                                          className="week-event"
                                          onClick={isFamilyAdmin ? () => open(occurrence) : undefined}
                                          disabled={!isFamilyAdmin}
                                      >
                                          <span className="week-time">{timeLabel(occurrence)}</span>
                                          <span className="week-title">
                                              {occurrence.event.title}
                                              {occurrence.event.repeat && (
                                                  <span className="week-repeat" title={describeRepeat(occurrence.event, new Date(occurrence.event.starts_at))}> ↻</span>
                                              )}
                                          </span>
                                          <span className="week-members">
                                              {occurrence.event.member_ids.map((id) => membersById.get(id)).filter((m) => m !== undefined)
                                                  .map((member) => <MemberAvatar key={member.id} member={member} size={26} />)}
                                          </span>
                                      </button>
                                  </li>
                              ))}
                          </ul>
                      </div>
                  ))}
              </>
          )}
          {notice && <p className="muted">{notice}</p>}

          {choosing && (
              <div className="overlay" onClick={() => setChoosing(null)}>
                  <div className="card occurrence-menu" onClick={(e) => e.stopPropagation()}>
                      <h2>{choosing.event.title}</h2>
                      <p className="muted">
                          {dayLabel(choosing.startsAt, today)} · ↻ {describeRepeat(choosing.event, new Date(choosing.event.starts_at))}
                      </p>
                      <button onClick={() => skipDate(choosing)}>Skip {skipLabel(dayLabel(choosing.startsAt, today))}</button>
                      <button onClick={() => { setEditing(choosing.event); setChoosing(null) }}>Edit series</button>
                      <button onClick={() => setChoosing(null)}>Cancel</button>
                  </div>
              </div>
          )}

          {editing && (
              <EventForm
                  members={members}
                  event={editing === "new" ? undefined : editing}
                  onSave={(input) => save(input, editing === "new" ? undefined : editing.id)}
                  onDelete={editing === "new" ? undefined : () => remove(editing.id)}
                  onClose={() => setEditing(null)}
              />
          )}
      </section>
  )
}

// "Skip today", "Skip tomorrow", "Skip Fri 9 Oct".
function skipLabel(day: string) {
  return day === "Today" || day === "Tomorrow" ? day.toLowerCase() : day
}

function timeLabel({ event, startsAt, endsAt }: EventOccurrence) {
  if (event.all_day) {
    return "All day"
  }
  const start = toTimeInput(startsAt)
  return endsAt ? `${start}–${toTimeInput(endsAt)}` : start
}

// Start of today, kept current: the kiosk screen stays on overnight, so "Today" must move at midnight.
function useToday() {
  const [today, setToday] = useState(() => startOfDay(new Date()))
  useEffect(() => {
    const timer = setInterval(() => {
      const now = startOfDay(new Date())
      setToday((current) => (current.getTime() === now.getTime() ? current : now))
    }, 60_000)
    return () => clearInterval(timer)
  }, [])
  return today
}

export default WeekCard
