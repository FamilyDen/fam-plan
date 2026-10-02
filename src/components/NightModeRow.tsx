import { useEffect, useRef, useState } from "react";
import FieldIcon from "./FieldIcon.tsx";
import type { FamilySettings } from "../lib/familySettings.ts";
import { useTranslation } from "react-i18next";

type NightModeRowProps = {
  settings: FamilySettings
  onSave: (settings: FamilySettings) => Promise<string | null>
}

const AUTOSAVE_MS = 700
const SAVED_NOTE_MS = 2000

// Night mode edited right in its row: a switch for on/off and the from/to times inline.
// Changes save on their own shortly after the last edit.
function NightModeRow({ settings, onSave }: NightModeRowProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(settings)
  const [state, setState] = useState<"idle" | "saving" | "saved" | string>("idle") // or an error message
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Follow saved settings (e.g. changed on another screen) when nothing is pending here.
  useEffect(() => {
    if (!timer.current) {
      setDraft(settings)
    }
  }, [settings])

  useEffect(() => () => clearTimeout(timer.current), [])

  function change(next: FamilySettings) {
    setDraft(next)
    clearTimeout(timer.current)
    if (next.nightMode && (!next.nightStart || !next.nightEnd)) {
      return // a time field is half-typed
    }
    if (next.nightMode && next.nightStart === next.nightEnd) {
      setState(t("night.sameTime"))
      return
    }
    timer.current = setTimeout(async () => {
      timer.current = undefined
      setState("saving")
      const failure = await onSave(next)
      setState(failure ?? "saved")
      if (!failure) {
        // Back to the description after a moment, unless another change started meanwhile.
        setTimeout(() => setState((current) => (current === "saved" ? "idle" : current)), SAVED_NOTE_MS)
      }
    }, AUTOSAVE_MS)
  }

  const status = state === "saving" ? t("common.saving") : state === "saved" ? t("common.saved") : state === "idle" ? null : state

  return (
      <div className="settings-row">
          <div className="settings-row-main night-row">
              <span className="settings-row-icon"><FieldIcon name="moon" /></span>
              <div className="settings-row-text">
                  <span className="settings-row-title">{t("night.title")}</span>
                  <span className={state !== "idle" && state !== "saving" && state !== "saved" ? "error" : "muted"}>
                      {status ?? t("night.subtitle")}
                  </span>
              </div>
              <div className={`night-times${draft.nightMode ? "" : " off"}`}>
                  <input
                      type="time"
                      value={draft.nightStart}
                      onChange={(e) => change({ ...draft, nightStart: e.target.value })}
                      disabled={!draft.nightMode}
                      aria-label={t("night.starts")}
                  />
                  <span className="muted">–</span>
                  <input
                      type="time"
                      value={draft.nightEnd}
                      onChange={(e) => change({ ...draft, nightEnd: e.target.value })}
                      disabled={!draft.nightMode}
                      aria-label={t("night.ends")}
                  />
              </div>
              <button
                  type="button"
                  role="switch"
                  aria-checked={draft.nightMode}
                  aria-label={t("night.title")}
                  className={`switch${draft.nightMode ? " on" : ""}`}
                  onClick={() => change({ ...draft, nightMode: !draft.nightMode })}
              >
                  <span />
              </button>
          </div>
      </div>
  )
}

export default NightModeRow
