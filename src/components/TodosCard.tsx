import { useState, type FormEvent } from "react";
import MemberAvatar from "./MemberAvatar.tsx";
import type { FamilyMember } from "../lib/familyMembers.ts";
import { useTodos } from "../lib/todos.ts";

// Family to-dos on the dashboard: add one at the top (optionally for one or more family members, picked
// once you start typing), tap a row to tick it off, and clear the done ones. "Unassigned" shows to-dos for nobody
// in particular, and a row of avatars filters the list to
// one person, e.g. a child checking their own chores on the kiosk. Works the same for parents and the kiosk.
const UNASSIGNED = "unassigned"

function TodosCard({ members }: { members: FamilyMember[] }) {
  const { todos, loading, error, add, setDone, clearDone } = useTodos()
  const [title, setTitle] = useState("")
  const [assignedTo, setAssignedTo] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  // A member id, UNASSIGNED for to-dos without anyone, or null for everything.
  const [filter, setFilter] = useState<string | null>(null)

  const membersById = new Map(members.map((m) => [m.id, m]))
  // A filter on someone who has since been removed from the family falls back to everyone.
  const activeFilter = filter === UNASSIGNED || (filter && membersById.has(filter)) ? filter : null
  const visible = activeFilter === UNASSIGNED
      ? todos.filter((t) => t.member_ids.length === 0)
      : activeFilter ? todos.filter((t) => t.member_ids.includes(activeFilter)) : todos
  const filteredMember = activeFilter && activeFilter !== UNASSIGNED ? membersById.get(activeFilter) : undefined
  const open = visible.filter((t) => !t.done)
  const done = visible.filter((t) => t.done)

  function changeFilter(next: string | null) {
    setFilter(next)
    // New to-dos go to the person being looked at (or nobody, under "Unassigned"), unless others are picked.
    setAssignedTo(next && next !== UNASSIGNED ? [next] : [])
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) {
      return
    }
    setSaving(true)
    const failure = await add(title.trim(), assignedTo)
    setSaving(false)
    setMessage(failure)
    if (!failure) {
      setTitle("")
      setAssignedTo(filteredMember ? [filteredMember.id] : [])
    }
  }

  function toggleAssignee(memberId: string) {
    setAssignedTo((current) => (current.includes(memberId) ? current.filter((m) => m !== memberId) : [...current, memberId]))
  }

  async function toggle(id: string, isDone: boolean) {
    setMessage(await setDone(id, isDone))
  }

  return (
      <section className="panel todos-card">
          <div className="panel-head">
              <h2>To-dos</h2>
              {!loading && !error && <span className="muted">{open.length === 0 ? "All done" : `${open.length} open`}</span>}
          </div>

          {error && <p className="error">{error}</p>}
          {loading && !error && <p className="muted">Loading…</p>}

          {!loading && !error && (
              <>
                  {members.length > 0 && (
                      <div className="todo-filter" role="radiogroup" aria-label="Show to-dos for">
                          <button
                              type="button"
                              role="radio"
                              aria-checked={activeFilter === null}
                              className={`todo-filter-all${activeFilter === null ? " selected" : ""}`}
                              onClick={() => changeFilter(null)}
                          >
                              All
                          </button>
                          <button
                              type="button"
                              role="radio"
                              aria-checked={activeFilter === UNASSIGNED}
                              className={`todo-filter-all${activeFilter === UNASSIGNED ? " selected" : ""}`}
                              onClick={() => changeFilter(activeFilter === UNASSIGNED ? null : UNASSIGNED)}
                          >
                              Unassigned
                          </button>
                          {members.map((member) => (
                              <button
                                  key={member.id}
                                  type="button"
                                  role="radio"
                                  aria-checked={activeFilter === member.id}
                                  aria-label={member.name}
                                  title={member.name}
                                  className={activeFilter === member.id ? "selected" : ""}
                                  onClick={() => changeFilter(activeFilter === member.id ? null : member.id)}
                              >
                                  <MemberAvatar member={member} size={30} />
                              </button>
                          ))}
                      </div>
                  )}

                  <form className="todo-add" onSubmit={submit}>
                      <div className="todo-add-row">
                          <input
                              value={title}
                              onChange={(e) => setTitle(e.target.value)}
                              placeholder="Add a to-do…"
                              aria-label="New to-do"
                              maxLength={120}
                          />
                          <button className="primary" type="submit" disabled={saving || !title.trim()} aria-label="Add to-do">+</button>
                      </div>
                      {title.trim() && members.length > 0 && (
                          <div className="todo-assignees" role="group" aria-label="For">
                              <span className="muted">For</span>
                              {members.map((member) => (
                                  <button
                                      key={member.id}
                                      type="button"
                                      aria-pressed={assignedTo.includes(member.id)}
                                      aria-label={member.name}
                                      title={member.name}
                                      className={assignedTo.includes(member.id) ? "selected" : ""}
                                      onClick={() => toggleAssignee(member.id)}
                                  >
                                      <MemberAvatar member={member} size={28} />
                                  </button>
                              ))}
                          </div>
                      )}
                  </form>

                  {visible.length === 0 && (
                      <p className="muted empty-note">
                          {filteredMember ? `Nothing on ${filteredMember.name}'s list.`
                              : activeFilter === UNASSIGNED ? "No unassigned to-dos." : "Nothing on the list."}
                      </p>
                  )}
                  <ul className="todo-list">
                      {[...open, ...done].map((todo) => {
                        const forMembers = todo.member_ids.map((id) => membersById.get(id)).filter((m) => m !== undefined)
                        return (
                            <li key={todo.id} className={todo.done ? "done" : ""}>
                                <button
                                    className="todo-toggle"
                                    role="checkbox"
                                    aria-checked={todo.done}
                                    onClick={() => toggle(todo.id, !todo.done)}
                                >
                                    <span className="todo-check" aria-hidden>{todo.done ? "✓" : ""}</span>
                                    <span className="todo-title">{todo.title}</span>
                                    {forMembers.length > 0 && (
                                        <span className="avatar-stack">
                                            {forMembers.map((m) => <MemberAvatar key={m.id} member={m} size={28} />)}
                                        </span>
                                    )}
                                </button>
                            </li>
                        )
                      })}
                  </ul>
                  {done.length > 0 && (
                      <button className="link-button" onClick={async () => setMessage(await clearDone(visible.map((t) => t.id)))}>
                          Clear {done.length} done
                      </button>
                  )}
              </>
          )}
          {message && <p className="error">{message}</p>}
      </section>
  )
}

export default TodosCard
