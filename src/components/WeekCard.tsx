import { useEffect, useState } from "react";
import EventForm from "./EventForm.tsx";
import MemberAvatar from "./MemberAvatar.tsx";
import type { FamilyMember } from "../lib/familyMembers.ts";
import { useEvents, type FamilyEvent } from "../lib/events.ts";
import { addDays, dayLabel, startOfDay, toDateInput, toTimeInput } from "../lib/dates.ts";
import { useIsFamilyAdmin } from "../lib/kiosk.ts";

const DAYS = 7

// The family's events for today and the next 6 days, grouped by day. Parents can add, edit and delete
// events; everyone else (including the kiosk) sees them read-only.
function WeekCard({ members }: { members: FamilyMember[] }) {
  const today = useToday()
  const isFamilyAdmin = useIsFamilyAdmin()
  const { events, loading, error, add, update, remove } = useEvents(today, addDays(today, DAYS))
  const [editing, setEditing] = useState<FamilyEvent | "new" | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const membersById = new Map(members.map((m) => [m.id, m]))
  const days = Array.from({ length: DAYS }, (_, i) => addDays(today, i))
      .map((day) => ({ day, events: events.filter((e) => toDateInput(new Date(e.starts_at)) === toDateInput(day)) }))
      .filter((d) => d.events.length > 0)

  // Tells the parent where an event went when it's saved outside the visible week.
  async function save(input: Parameters<typeof add>[0], id?: string) {
    const failure = id ? await update(id, input) : await add(input)
    if (!failure) {
      const outside = input.startsAt < today || input.startsAt >= addDays(today, DAYS)
      setNotice(outside ? `Saved for ${dayLabel(input.startsAt, today)}. It will show here in that week.` : null)
    }
    return failure
  }

  return (
      <section className="card week-card">
          <h2>This week</h2>
          {error && <p className="error">{error}</p>}
          {loading && !error && <p className="muted">Loading…</p>}

          {!loading && !error && (
              <>
                  {days.length === 0 && <p className="muted">Nothing planned this week.</p>}
                  {days.map(({ day, events }) => (
                      <div key={toDateInput(day)} className="week-day">
                          <h3>{dayLabel(day, today)}</h3>
                          <ul>
                              {events.map((event) => (
                                  <li key={event.id}>
                                      <button
                                          className="week-event"
                                          onClick={isFamilyAdmin ? () => setEditing(event) : undefined}
                                          disabled={!isFamilyAdmin}
                                      >
                                          <span className="week-time">{timeLabel(event)}</span>
                                          <span className="week-title">{event.title}</span>
                                          <span className="week-members">
                                              {event.member_ids.map((id) => membersById.get(id)).filter((m) => m !== undefined)
                                                  .map((member) => <MemberAvatar key={member.id} member={member} size={24} />)}
                                          </span>
                                      </button>
                                  </li>
                              ))}
                          </ul>
                      </div>
                  ))}
                  {isFamilyAdmin && <button className="primary" onClick={() => { setNotice(null); setEditing("new") }}>Add event</button>}
              </>
          )}
          {notice && <p className="muted">{notice}</p>}

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

function timeLabel(event: FamilyEvent) {
  if (event.all_day) {
    return "All day"
  }
  const start = toTimeInput(new Date(event.starts_at))
  return event.ends_at ? `${start}–${toTimeInput(new Date(event.ends_at))}` : start
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
