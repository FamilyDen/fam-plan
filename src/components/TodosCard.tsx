import { useState, type FormEvent } from "react";
import MemberAvatar from "./MemberAvatar.tsx";
import type { FamilyMember } from "../lib/familyMembers.ts";
import { useTodos } from "../lib/todos.ts";

// Family to-dos on the dashboard: add one (optionally for a family member), tap to tick it off,
// and clear the done ones. Works the same for parents and the kiosk.
function TodosCard({ members }: { members: FamilyMember[] }) {
  const { todos, loading, error, add, setDone, clearDone } = useTodos()
  const [title, setTitle] = useState("")
  const [assignedTo, setAssignedTo] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const membersById = new Map(members.map((m) => [m.id, m]))
  const open = todos.filter((t) => !t.done)
  const done = todos.filter((t) => t.done)

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
      setAssignedTo(null)
    }
  }

  async function toggle(id: string, isDone: boolean) {
    setMessage(await setDone(id, isDone))
  }

  return (
      <section className="card todos-card">
          <h2>To-dos</h2>
          {error && <p className="error">{error}</p>}
          {loading && !error && <p className="muted">Loading…</p>}

          {!loading && !error && (
              <>
                  {open.length === 0 && <p className="muted">Nothing on the list.</p>}
                  <ul className="todo-list">
                      {[...open, ...done].map((todo) => {
                        const member = todo.assigned_to ? membersById.get(todo.assigned_to) : undefined
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
                                    {member && <MemberAvatar member={member} size={28} />}
                                </button>
                            </li>
                        )
                      })}
                  </ul>
                  {done.length > 0 && (
                      <button className="link-button" onClick={async () => setMessage(await clearDone())}>
                          Clear {done.length} done
                      </button>
                  )}

                  <form className="todo-form" onSubmit={submit}>
                      <input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Add a to-do…"
                          aria-label="New to-do"
                          maxLength={120}
                      />
                      {members.length > 0 && (
                          <div className="todo-assignees" role="radiogroup" aria-label="For">
                              {members.map((member) => (
                                  <button
                                      key={member.id}
                                      type="button"
                                      role="radio"
                                      aria-checked={assignedTo === member.id}
                                      aria-label={member.name}
                                      title={member.name}
                                      className={assignedTo === member.id ? "selected" : ""}
                                      onClick={() => setAssignedTo(assignedTo === member.id ? null : member.id)}
                                  >
                                      <MemberAvatar member={member} size={32} />
                                  </button>
                              ))}
                          </div>
                      )}
                      <button className="primary" type="submit" disabled={saving || !title.trim()}>Add</button>
                  </form>
              </>
          )}
          {message && <p className="error">{message}</p>}
      </section>
  )
}

export default TodosCard
