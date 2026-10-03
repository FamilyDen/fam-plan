import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import FieldIcon from "./FieldIcon.tsx";
import MemberAvatar from "./MemberAvatar.tsx";
import type { Chore, ChoreInput } from "../lib/chores.ts";
import type { FamilyMember } from "../lib/familyMembers.ts";
import { weekdaysInOrder } from "../i18n/index.ts";
import { weekdayName } from "../lib/dates.ts";
import { ALL_DAYS, WORKWEEK } from "../lib/recurrence.ts";

type ChoreFormProps = {
  members: FamilyMember[]
  chore?: Chore
  // Each returns an error message to show, or null on success.
  onSave: (input: ChoreInput) => Promise<string | null>
  onDelete?: () => Promise<string | null>
  onClose: () => void
}

type When = "daily" | "weekdays" | "days"

function whenOf(weekdays: number[]): When {
  const same = (a: number[], b: number[]) => a.length === b.length && b.every((d) => a.includes(d))
  return same(weekdays, ALL_DAYS) ? "daily" : same(weekdays, WORKWEEK) ? "weekdays" : "days"
}

// Add or edit a chore in a sheet over the dashboard: title, who does it, which days, and how many stars.
function ChoreForm({ members, chore, onSave, onDelete, onClose }: ChoreFormProps) {
  const { t } = useTranslation()
  const children = members.filter((m) => m.role === "child")
  const [title, setTitle] = useState(chore?.title ?? "")
  const [memberIds, setMemberIds] = useState<string[]>(chore?.member_ids ?? children.map((m) => m.id))
  const [when, setWhen] = useState<When>(chore ? whenOf(chore.weekdays) : "daily")
  const [days, setDays] = useState<number[]>(chore && whenOf(chore.weekdays) === "days" ? chore.weekdays : [])
  const [stars, setStars] = useState(chore?.stars ?? 1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Built on the latest selection, so quick taps in a row all count.
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const weekdays = when === "daily" ? ALL_DAYS : when === "weekdays" ? WORKWEEK : days
    if (!title.trim()) {
      setError(t("chores.enterTitle"))
      return
    }
    if (memberIds.length === 0) {
      setError(t("chores.pickMember"))
      return
    }
    if (weekdays.length === 0) {
      setError(t("chores.pickDay"))
      return
    }
    setSaving(true)
    const failure = await onSave({ title: title.trim(), member_ids: memberIds, weekdays, stars })
    setSaving(false)
    if (failure) {
      setError(failure)
    } else {
      onClose()
    }
  }

  async function remove() {
    if (!onDelete || !window.confirm(t("chores.confirmDelete", { title: chore?.title }))) {
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
                  <span className="muted">{chore ? t("chores.edit") : t("chores.new")}</span>
                  <button type="button" className="icon-button" onClick={onClose} aria-label={t("common.close")}>
                      <FieldIcon name="x" />
                  </button>
              </div>

              <div className="event-sheet-title">
                  <input
                      value={title}
                      onChange={(e) => { setTitle(e.target.value); setError(null) }}
                      placeholder={t("chores.titlePlaceholder")}
                      aria-label={t("event.title")}
                      maxLength={60}
                      autoFocus={!chore}
                  />
              </div>

              <div className="event-fields">
                  <span className="field-label field-label-top"><FieldIcon name="users" />{t("event.who")}</span>
                  <div className="who-picker" role="group" aria-label={t("event.who")}>
                      {members.map((member) => {
                        const selected = memberIds.includes(member.id)
                        return (
                            <button
                                key={member.id}
                                type="button"
                                aria-pressed={selected}
                                className={`who-option${selected ? " selected" : ""}`}
                                onClick={() => setMemberIds((current) => toggle(current, member.id))}
                            >
                                <MemberAvatar member={member} size={40} />
                                <span>{member.name}</span>
                            </button>
                        )
                      })}
                  </div>

                  <span className="field-label field-label-top"><FieldIcon name="calendar" />{t("chores.when")}</span>
                  <div className="repeat-picker">
                      <div className="segmented" role="radiogroup" aria-label={t("chores.when")}>
                          {(["daily", "weekdays", "days"] as const).map((option) => (
                              <button key={option} type="button" role="radio" aria-checked={when === option}
                                      className={when === option ? "selected" : ""} onClick={() => setWhen(option)}>
                                  {t(`chores.whenOptions.${option}`)}
                              </button>
                          ))}
                      </div>
                      {when === "days" && (
                          <div className="day-chips" role="group" aria-label={t("repeat.onDays")}>
                              {weekdaysInOrder().map((weekday) => (
                                  <button key={weekday} type="button" aria-pressed={days.includes(weekday)}
                                          className={days.includes(weekday) ? "selected" : ""}
                                          onClick={() => setDays((current) => toggle(current, weekday))}>
                                      {weekdayName(weekday, "short")}
                                  </button>
                              ))}
                          </div>
                      )}
                  </div>

                  <span className="field-label"><FieldIcon name="star" />{t("chores.stars")}</span>
                  <div className="star-picker" role="radiogroup" aria-label={t("chores.stars")}>
                      {[1, 2, 3].map((n) => (
                          <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={t("chores.starCount", { count: n })}
                                  className={n <= stars ? "on" : ""} onClick={() => setStars(n)}>
                              <FieldIcon name="star" size={26} />
                          </button>
                      ))}
                  </div>
              </div>

              {error && <p className="error event-sheet-error">{error}</p>}

              <div className="event-sheet-footer">
                  {onDelete && (
                      <button type="button" className="text-danger-button" onClick={remove} disabled={saving}>
                          <FieldIcon name="trash" size={16} />{t("common.delete")}
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

export default ChoreForm
