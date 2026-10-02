import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import FieldIcon, { type IconName } from "../components/FieldIcon.tsx";
import NightModeRow from "../components/NightModeRow.tsx";
import PinPad from "../components/PinPad.tsx";
import StartKioskButton from "../components/StartKioskButton.tsx";
import { useFamilySettings } from "../lib/familySettings.ts";
import { formatLongDate, formatTime } from "../lib/dates.ts";
import { useApi, useIsFamilyAdmin } from "../lib/kiosk.ts";
import { Trans, useTranslation } from "react-i18next";

type PinStatus = { hasPin: boolean, disabled: boolean }
type OpenRow = "pin" | "install" | null

// For family admins (parents): start the family screen on this device, and its settings —
// your unlock PIN, the night mode hours (edited inline, saved automatically), and how to install it as a full-screen app.
// ("Family screen" is the family's kiosk account; the route and API keep the kiosk name.)
function KioskSettings() {
  const { t } = useTranslation()
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
              <h1>{t("screen.title")}</h1>
              <p className="muted">{t("screen.subtitle")}</p>
          </header>

          <section className="panel screen-hero">
              <ScreenPreview />
              <div>
                  <h2>{t("screen.heroTitle")}</h2>
                  <p className="muted">{t("screen.heroText")}</p>
                  {status && !pinReady && (
                      <p className="warning-note">{t("screen.setPinFirst")}</p>
                  )}
                  <StartKioskButton />
              </div>
          </section>

          <section className="panel settings-list">
              <SettingsRow
                  icon="lock"
                  title={t("screen.pin.title")}
                  subtitle={t("screen.pin.subtitle")}
                  value={status && (
                      <span className={`badge ${pinReady ? "badge-success" : "badge-warning"}`}>
                          {status.disabled ? t("screen.pin.disabled") : status.hasPin ? t("screen.pin.set") : t("screen.pin.notSet")}
                      </span>
                  )}
                  action={pinReady ? t("screen.pin.change") : t("screen.pin.setAction")}
                  open={open === "pin"}
                  onToggle={() => toggle("pin")}
              >
                  <PinEditor
                      onSaved={(next) => { setStatus(next); setOpen(null) }}
                      onCancel={() => setOpen(null)}
                  />
              </SettingsRow>

              <NightModeRow settings={settings} onSave={saveSettings} />

              <SettingsRow
                  icon="tablet"
                  title={t("screen.install.title")}
                  subtitle={t("screen.install.subtitle")}
                  action={t("screen.install.how")}
                  open={open === "install"}
                  onToggle={() => toggle("install")}
              >
                  <ol className="install-steps">
                      <li><Trans i18nKey="screen.install.step1" components={{ b: <strong /> }} /></li>
                      <li><Trans i18nKey="screen.install.step2" components={{ b: <strong /> }} /></li>
                      <li><Trans i18nKey="screen.install.step3" components={{ b: <strong /> }} /></li>
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
  const { t } = useTranslation()
  return (
      <div className={`settings-row${open ? " open" : ""}`}>
          <div className="settings-row-main">
              <span className="settings-row-icon"><FieldIcon name={icon} /></span>
              <div className="settings-row-text">
                  <span className="settings-row-title">{title}</span>
                  <span className="muted">{subtitle}</span>
              </div>
              {value}
              <button className="link-button" onClick={onToggle} aria-expanded={open}>{open ? t("common.close") : action}</button>
          </div>
          {open && <div className="settings-row-body">{children}</div>}
      </div>
  )
}

// Enter a new PIN twice on the pad; saves it on the server (which clears any lockout).
function PinEditor({ onSaved, onCancel }: { onSaved: (status: PinStatus) => void, onCancel: () => void }) {
  const { t } = useTranslation()
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
      setMessage(t("screen.pin.mismatch"))
      return
    }
    const response = await api("/api/kiosk-pin", { method: "POST", body: JSON.stringify({ pin }) })
    setFirstPin(null)
    if (!response.ok) {
      setMessage(t("screen.pin.saveFailed"))
      return
    }
    onSaved(await response.json())
  }

  return (
      <div className="pin-editor">
          <p>{firstPin === null ? t("screen.pin.enterNew") : t("screen.pin.confirm")}</p>
          <PinPad onSubmit={enter} />
          {message && <p className="error">{message}</p>}
          <button type="button" onClick={onCancel}>{t("common.cancel")}</button>
      </div>
  )
}

// A tiny sketch of the family screen: clock, date and two cards.
function ScreenPreview() {
  const now = new Date()
  return (
      <div className="screen-preview" aria-hidden>
          <span className="screen-preview-time">{formatTime(now)}</span>
          <span className="screen-preview-date">{formatLongDate(now)}</span>
          <div className="screen-preview-cards">
              <span><i /><i /><i /></span>
              <span><i /><i /><i /></span>
          </div>
      </div>
  )
}

export default KioskSettings
