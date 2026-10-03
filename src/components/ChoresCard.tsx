import { useState } from "react";
import { useTranslation } from "react-i18next";
import ChoreColumn from "./ChoreColumn.tsx";
import ChoreForm from "./ChoreForm.tsx";
import MemberAvatar from "./MemberAvatar.tsx";
import { choresFor, useChores, type Chore } from "../lib/chores.ts";
import { weekdayName } from "../lib/dates.ts";
import { useToday } from "../lib/display.ts";
import type { FamilyMember } from "../lib/familyMembers.ts";
import { useIsFamilyAdmin } from "../lib/kiosk.ts";
import { ALL_DAYS, WORKWEEK } from "../lib/recurrence.ts";
import { weekdaysInOrder } from "../i18n/index.ts";

// Today's chores on the dashboard and family screen: a column per child (and anyone else with chores) with
// big tap targets, this week's stars and progress towards their weekly goal. Parents add chores, and in
// "Manage" mode see every chore to edit or delete it.
function ChoresCard({ members }: { members: FamilyMember[] }) {
  const { t } = useTranslation()
  const today = useToday()
  const isFamilyAdmin = useIsFamilyAdmin()
  const { chores, completions, loading, error, setDone, add, update, remove } = useChores(today)
  const [editing, setEditing] = useState<Chore | "new" | null>(null)
  const [managing, setManaging] = useState(false)
  const [justDone, setJustDone] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Children always get a column; others only if they have chores.
  const people = members.filter((m) => m.role === "child" || chores.some((c) => c.member_ids.includes(m.id)))

  async function tick(chore: Chore, member: FamilyMember, done: boolean) {
    const key = `${chore.id}:${member.id}`
    if (done) {
      setJustDone(key)
      setTimeout(() => setJustDone((current) => (current === key ? null : current)), 700)
    }
    setMessage(await setDone(chore, member.id, today, done))
  }

  if (!loading && !error && people.length === 0 && !isFamilyAdmin) {
    return null
  }

  return (
      <section className="panel chores-card">
          <div className="panel-head">
              <h2>{t("chores.title")}</h2>
              {isFamilyAdmin && !loading && !error && (
                  <span className="panel-actions">
                      {chores.length > 0 && (
                          <button className={`panel-action${managing ? " active" : ""}`} onClick={() => setManaging((m) => !m)}>
                              {managing ? t("common.close") : t("chores.manage")}
                          </button>
                      )}
                      <button className="panel-action" onClick={() => setEditing("new")}>{t("chores.add")}</button>
                  </span>
              )}
          </div>

          {error && <p className="error">{error}</p>}
          {loading && !error && <p className="muted">{t("common.loading")}</p>}

          {!loading && !error && chores.length === 0 && (
              <p className="muted empty-note">{isFamilyAdmin ? t("chores.emptyParent") : t("chores.empty")}</p>
          )}

          {!loading && !error && managing && (
              <ul className="chore-manage-list">
                  {chores.map((chore) => (
                      <li key={chore.id}>
                          <button className="week-event" onClick={() => setEditing(chore)}>
                              <span className="week-title">{chore.title}</span>
                              <span className="muted chore-days">{daysLabel(chore.weekdays, t)}</span>
                              <span className="chore-stars">{"★".repeat(chore.stars)}</span>
                              <span className="week-members">
                                  {chore.member_ids.map((id) => members.find((m) => m.id === id)).filter((m) => m !== undefined)
                                      .map((m) => <MemberAvatar key={m.id} member={m} size={24} />)}
                              </span>
                          </button>
                      </li>
                  ))}
              </ul>
          )}

          {!loading && !error && !managing && chores.length > 0 && (
              <div className="chore-columns">
                  {people.map((member) => (
                      <ChoreColumn
                          key={member.id}
                          member={member}
                          chores={choresFor(chores, member.id, today)}
                          completions={completions}
                          today={today}
                          justDone={justDone}
                          onTick={(chore, done) => tick(chore, member, done)}
                      />
                  ))}
              </div>
          )}
          {message && <p className="error">{message}</p>}

          {editing && (
              <ChoreForm
                  members={members}
                  chore={editing === "new" ? undefined : editing}
                  onSave={(input) => (editing === "new" ? add(input) : update(editing.id, input))}
                  onDelete={editing === "new" ? undefined : () => remove(editing.id)}
                  onClose={() => setEditing(null)}
              />
          )}
      </section>
  )
}

// "Every day", "Weekdays" or "Mon, Wed, Fri" in the current language.
function daysLabel(weekdays: number[], t: (key: string) => string) {
  const has = (days: number[]) => days.length === weekdays.length && days.every((d) => weekdays.includes(d))
  if (has(ALL_DAYS)) {
    return t("chores.whenOptions.daily")
  }
  if (has(WORKWEEK)) {
    return t("chores.whenOptions.weekdays")
  }
  return weekdaysInOrder().filter((d) => weekdays.includes(d)).map((d) => weekdayName(d, "short")).join(", ")
}

export default ChoresCard
