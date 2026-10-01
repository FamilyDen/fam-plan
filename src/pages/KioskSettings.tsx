import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import FieldIcon, { type IconName } from "../components/FieldIcon.tsx";
import PinPad from "../components/PinPad.tsx";
import StartKioskButton from "../components/StartKioskButton.tsx";
import { useFamilySettings, type FamilySettings } from "../lib/familySettings.ts";
import { useApi, useIsFamilyAdmin } from "../lib/kiosk.ts";

type PinStatus = { hasPin: boolean, disabled: boolean }
type OpenRow = "pin" | "night" | "install" | null

// For family admins (parents): start the family screen on this device, and its settings —
// your unlock PIN, the night mode hours, and how to install it as a full-screen app.
// ("Family screen" is the family's kiosk account; the route and API keep the kiosk name.)
function KioskSettings() {
  const isFamilyAdmin = useIsFamilyAdmin()
  const api = useApi()
  const { settings, save: saveSettings } = useFamilySettings()
  const [status, setStatus] = useState<PinStatus | null>(null)
  const [open, setOpen] = useState<OpenRow>(null)

  useEffect(() => {
    if (!isFamilyAdmin) {
      return
    }
    api("/api/kiosk-pin")
        .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
        .then(setStatus)
        .catch(() => setStatus(null))
  }, [api, isFamilyAdmin])

  if (!isFamilyAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  const pinReady = status?.hasPin && !status.disabled
  const toggle = (row: OpenRow) => setOpen((current) => (current === row ? null : row))

  return (
      <div className="family-screen-page">
          <header className="page-header">
              <h1>Family screen</h1>
              <p className="muted">Turn this device into the shared screen in the family room.</p>
          </header>

          <section className="panel screen-hero">
              <ScreenPreview />
              <div>
                  <h2>Use this device as the family screen</h2>
                  <p className="muted">
                      Shows the clock, this week and to-dos. Kids can tick off to-dos without logging in;
                      you unlock it with your PIN.
                  </p>
                  {status && !pinReady && (
                      <p className="warning-note">Set your unlock PIN first, or you'll need your password to leave the family screen.</p>
                  )}
                  <StartKioskButton />
              </div>
          </section>

          <section className="panel settings-list">
              <SettingsRow
                  icon="lock"
                  title="Your unlock PIN"
                  subtitle="Used to leave the family screen"
                  value={status && (
                      <span className={`badge ${pinReady ? "badge-success" : "badge-warning"}`}>
                          {status.disabled ? "Disabled" : status.hasPin ? "✓ Set" : "Not set"}
                      </span>
                  )}
                  action={pinReady ? "Change" : "Set"}
                  open={open === "pin"}
                  onToggle={() => toggle("pin")}
              >
                  <PinEditor
                      onSaved={(next) => { setStatus(next); setOpen(null) }}
                      onCancel={() => setOpen(null)}
                  />
              </SettingsRow>

              <SettingsRow
                  icon="moon"
                  title="Night mode"
                  subtitle="Dims the family screen to a quiet clock at night"
                  value={<span className="muted">{settings.nightMode ? `${settings.nightStart}–${settings.nightEnd}` : "Off"}</span>}
                  action="Edit"
                  open={open === "night"}
                  onToggle={() => toggle("night")}
              >
                  <NightModeEditor
                      initial={settings}
                      onSave={async (next) => {
                        const failure = await saveSettings(next)
                        if (!failure) {
                          setOpen(null)
                        }
                        return failure
                      }}
                      onCancel={() => setOpen(null)}
                  />
              </SettingsRow>

              <SettingsRow
                  icon="tablet"
                  title="Full-screen app"
                  subtitle="Open it like an app, without the browser bar"
                  action="How"
                  open={open === "install"}
                  onToggle={() => toggle("install")}
              >
                  <ol className="install-steps">
                      <li>On the tablet, sign in here and tap <strong>Start family screen</strong>.</li>
                      <li>iPad: tap <strong>Share → Add to Home Screen</strong>. Android: tap <strong>⋮ → Install app</strong>.</li>
                      <li>Open FamPlan from the home screen. It fills the screen and stays awake during the day.</li>
                  </ol>
              </SettingsRow>
          </section>
      </div>
  )
}

type SettingsRowProps = {
  icon: IconName
  title: string
  subtitle: string
  value?: ReactNode
  action: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}

// One row of the settings list; its editor expands in place below it.
function SettingsRow({ icon, title, subtitle, value, action, open, onToggle, children }: SettingsRowProps) {
  return (
      <div className={`settings-row${open ? " open" : ""}`}>
          <div className="settings-row-main">
              <span className="settings-row-icon"><FieldIcon name={icon} /></span>
              <div className="settings-row-text">
                  <span className="settings-row-title">{title}</span>
                  <span className="muted">{subtitle}</span>
              </div>
              {value}
              <button className="link-button" onClick={onToggle} aria-expanded={open}>{open ? "Close" : action}</button>
          </div>
          {open && <div className="settings-row-body">{children}</div>}
      </div>
  )
}

// Enter a new PIN twice on the pad; saves it on the server (which clears any lockout).
function PinEditor({ onSaved, onCancel }: { onSaved: (status: PinStatus) => void, onCancel: () => void }) {
  const api = useApi()
  const [firstPin, setFirstPin] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function enter(pin: string) {
    if (firstPin === null) {
      setFirstPin(pin)
      setMessage(null)
      return
    }
    if (pin !== firstPin) {
      setFirstPin(null)
      setMessage("The PINs didn't match. Start over.")
      return
    }
    const response = await api("/api/kiosk-pin", { method: "POST", body: JSON.stringify({ pin }) })
    setFirstPin(null)
    if (!response.ok) {
      setMessage("Couldn't save your PIN")
      return
    }
    onSaved(await response.json())
  }

  return (
      <div className="pin-editor">
          <p>{firstPin === null ? "Enter a new PIN (4–8 digits)" : "Enter it again to confirm"}</p>
          <PinPad onSubmit={enter} />
          {message && <p className="error">{message}</p>}
          <button type="button" onClick={onCancel}>Cancel</button>
      </div>
  )
}

type NightModeEditorProps = {
  initial: FamilySettings
  onSave: (settings: FamilySettings) => Promise<string | null>
  onCancel: () => void
}

function NightModeEditor({ initial, onSave, onCancel }: NightModeEditorProps) {
  const [nightMode, setNightMode] = useState(initial.nightMode)
  const [nightStart, setNightStart] = useState(initial.nightStart)
  const [nightEnd, setNightEnd] = useState(initial.nightEnd)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (nightMode && nightStart === nightEnd) {
      setError("Start and end can't be the same time")
      return
    }
    setSaving(true)
    setError(await onSave({ nightMode, nightStart, nightEnd }))
    setSaving(false)
  }

  return (
      <div className="night-editor">
          <div className="field-row">
              <div className="segmented" role="radiogroup" aria-label="Night mode">
                  <button type="button" role="radio" aria-checked={nightMode} className={nightMode ? "selected" : ""} onClick={() => setNightMode(true)}>On</button>
                  <button type="button" role="radio" aria-checked={!nightMode} className={nightMode ? "" : "selected"} onClick={() => setNightMode(false)}>Off</button>
              </div>
              {nightMode && (
                  <>
                      <span className="muted">from</span>
                      <input type="time" value={nightStart} onChange={(e) => setNightStart(e.target.value)} aria-label="Night starts" required />
                      <span className="muted">to</span>
                      <input type="time" value={nightEnd} onChange={(e) => setNightEnd(e.target.value)} aria-label="Night ends" required />
                  </>
              )}
          </div>
          {error && <p className="error">{error}</p>}
          <div className="field-row">
              <button className="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
              <button onClick={onCancel}>Cancel</button>
          </div>
      </div>
  )
}

// A tiny sketch of the family screen: clock, date and two cards.
function ScreenPreview() {
  const now = new Date()
  return (
      <div className="screen-preview" aria-hidden>
          <span className="screen-preview-time">{now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}</span>
          <span className="screen-preview-date">{now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</span>
          <div className="screen-preview-cards">
              <span><i /><i /><i /></span>
              <span><i /><i /><i /></span>
          </div>
      </div>
  )
}

export default KioskSettings
