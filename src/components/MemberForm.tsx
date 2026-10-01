import { useState, type FormEvent } from "react";
import MemberAvatar from "./MemberAvatar.tsx";
import { MEMBER_COLORS, type FamilyMemberInput, type FamilyRole } from "../lib/familyMembers.ts";

type MemberFormProps = {
  initial?: FamilyMemberInput
  submitLabel: string
  // Returns an error message to show, or null when saved.
  onSubmit: (input: FamilyMemberInput) => Promise<string | null>
  onCancel?: () => void
}

// Add or edit a family member: name, parent/child and a color.
function MemberForm({ initial, submitLabel, onSubmit, onCancel }: MemberFormProps) {
  const [name, setName] = useState(initial?.name ?? "")
  const [role, setRole] = useState<FamilyRole>(initial?.role ?? "child")
  const [color, setColor] = useState(initial?.color ?? MEMBER_COLORS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError("Enter a name")
      return
    }
    setSaving(true)
    const failure = await onSubmit({ name: name.trim(), role, color })
    setSaving(false)
    setError(failure)
    if (!failure && !initial) {
      setName("")
    }
  }

  return (
      <form className="member-form" onSubmit={submit}>
          <div className="member-form-row">
              <MemberAvatar member={{ name: name || "?", color }} />
              <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  aria-label="Name"
                  maxLength={40}
              />
              <select value={role} onChange={(e) => setRole(e.target.value as FamilyRole)} aria-label="Role">
                  <option value="child">Child</option>
                  <option value="parent">Parent</option>
              </select>
          </div>
          <div className="color-picker" role="radiogroup" aria-label="Color">
              {MEMBER_COLORS.map((c) => (
                  <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={c === color}
                      aria-label={c}
                      className={c === color ? "selected" : ""}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                  />
              ))}
          </div>
          <div className="member-form-row">
              <button className="primary" type="submit" disabled={saving}>{saving ? "Saving…" : submitLabel}</button>
              {onCancel && <button type="button" onClick={onCancel}>Cancel</button>}
          </div>
          {error && <p className="error">{error}</p>}
      </form>
  )
}

export default MemberForm
