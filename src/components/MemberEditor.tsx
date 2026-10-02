import { useState, type FormEvent } from "react";
import FieldIcon from "./FieldIcon.tsx";
import MemberAvatar from "./MemberAvatar.tsx";
import { MEMBER_COLORS, type FamilyMemberInput, type FamilyRole } from "../lib/familyMembers.ts";
import { useTranslation } from "react-i18next";

type MemberEditorProps = {
  initial: FamilyMemberInput
  isNew: boolean
  // Each returns an error message to show, or null on success.
  onSave: (input: FamilyMemberInput) => Promise<string | null>
  onRemove?: () => Promise<string | null>
  onClose: () => void
}

// A member card expanded in place: name, parent/child and color, with Remove / Cancel / Save.
// The avatar previews the name and color as they change.
function MemberEditor({ initial, isNew, onSave, onRemove, onClose }: MemberEditorProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial.name)
  const [role, setRole] = useState<FamilyRole>(initial.role)
  const [color, setColor] = useState(initial.color ?? MEMBER_COLORS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError(t("members.enterName"))
      return
    }
    setSaving(true)
    const failure = await onSave({ name: name.trim(), role, color })
    setSaving(false)
    if (failure) {
      setError(failure)
    } else {
      onClose()
    }
  }

  async function remove() {
    if (!onRemove || !window.confirm(t("members.confirmRemove", { name: initial.name }))) {
      return
    }
    setSaving(true)
    const failure = await onRemove()
    setSaving(false)
    if (failure) {
      setError(failure)
    } else {
      onClose()
    }
  }

  return (
      <form
          className="member-editor"
          onSubmit={submit}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
          aria-label={isNew ? t("members.addMember") : t("members.edit", { name: initial.name })}
      >
          <div className="member-editor-head">
              <MemberAvatar member={{ name: name || "?", color }} size={56} />
              <input
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(null) }}
                  placeholder={t("members.name")}
                  aria-label={t("members.name")}
                  maxLength={40}
                  autoFocus
              />
              <button type="button" className="icon-button" onClick={onClose} aria-label={t("common.close")}>
                  <FieldIcon name="x" />
              </button>
          </div>

          <div className="event-fields member-editor-fields">
              <span className="field-label">{t("members.role")}</span>
              <div className="segmented" role="radiogroup" aria-label={t("members.role")}>
                  {(["parent", "child"] as const).map((r) => (
                      <button key={r} type="button" role="radio" aria-checked={role === r} className={role === r ? "selected" : ""} onClick={() => setRole(r)}>
                          {t(`members.roles.${r}`)}
                      </button>
                  ))}
              </div>

              <span className="field-label">{t("members.color")}</span>
              <div className="color-picker" role="radiogroup" aria-label={t("members.color")}>
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
          </div>

          {error && <p className="error member-editor-error">{error}</p>}

          <div className="event-sheet-footer">
              {onRemove && (
                  <button type="button" className="text-danger-button" onClick={remove} disabled={saving}>
                      <FieldIcon name="trash" size={16} />{t("members.remove")}
                  </button>
              )}
              <span className="spacer" />
              <button type="button" onClick={onClose}>{t("common.cancel")}</button>
              <button className="primary" type="submit" disabled={saving}>{saving ? t("common.saving") : isNew ? t("common.add") : t("common.save")}</button>
          </div>
      </form>
  )
}

export default MemberEditor
