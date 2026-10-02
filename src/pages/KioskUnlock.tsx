import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react";
import PinPad from "../components/PinPad.tsx";
import { useApi, useIsKiosk, useSwitchAccount } from "../lib/kiosk.ts";
import { useTranslation } from "react-i18next";
import i18n from "../i18n/index.ts";

type Parent = { userId: string, name: string, imageUrl: string, hasPin: boolean }

type UnlockError = { error: string, attemptsLeft?: number, lockedUntil?: number }

function describeError(result: UnlockError) {
  switch (result.error) {
    case "wrong_pin":
      return i18n.t("unlock.wrongPin", { count: result.attemptsLeft })
    case "locked": {
      const minutes = Math.max(1, Math.ceil(((result.lockedUntil ?? 0) - Date.now()) / 60000))
      return i18n.t("unlock.locked", { count: minutes })
    }
    case "disabled":
      return i18n.t("unlock.disabled")
    case "no_pin":
      return i18n.t("unlock.noPin")
    default:
      return i18n.t("unlock.failed")
  }
}

// Kiosk only: a parent picks themselves and enters their PIN to take over the screen.
// Kiosk mode stays on until the PIN is verified by the server.
function KioskUnlock() {
  const { t } = useTranslation()
  const isKiosk = useIsKiosk()
  const api = useApi()
  const switchAccount = useSwitchAccount()
  const { signOut } = useClerk()
  const [parents, setParents] = useState<Parent[] | null>(null)
  const [selected, setSelected] = useState<Parent | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isKiosk) {
      return
    }
    api("/api/kiosk-parents")
        .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
        .then(({ parents }) => setParents(parents))
        .catch(() => setMessage(t("unlock.loadFailed")))
  }, [api, isKiosk, t])

  if (!isKiosk) {
    return <Navigate to="/dashboard" replace />
  }

  // Ends kiosk mode without a PIN, so a parent must be at hand to sign in; confirm to avoid accidental taps.
  function signInWithPassword() {
    if (window.confirm(t("unlock.confirmPassword"))) {
      signOut({ redirectUrl: "/dashboard" })
    }
  }

  async function unlock(pin: string) {
    if (!selected) {
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      const response = await api("/api/kiosk-exit", {
        method: "POST",
        body: JSON.stringify({ userId: selected.userId, pin }),
      })
      const result = await response.json()
      if (!response.ok) {
        setMessage(describeError(result))
        setBusy(false)
        return
      }
      await switchAccount(result)
    } catch (e) {
      console.error(e)
      setMessage(t("unlock.failed"))
      setBusy(false)
    }
  }

  return (
      <div className="kiosk-unlock">
          <h1>{t("unlock.title")}</h1>

          {!selected && (
              <>
                  <p className="muted">{t("unlock.who")}</p>
                  {parents === null && !message && <p className="muted">{t("common.loading")}</p>}
                  <div className="parent-picker">
                      {parents?.map((parent) => (
                          <button key={parent.userId} onClick={() => { setSelected(parent); setMessage(null) }}>
                              <img src={parent.imageUrl} alt="" />
                              <span>{parent.name}</span>
                          </button>
                      ))}
                  </div>
              </>
          )}

          {selected && (
              <>
                  <p>{t("unlock.enterPin", { name: selected.name })}</p>
                  {selected.hasPin ? <PinPad onSubmit={unlock} disabled={busy} /> : <p className="muted">{t("unlock.noPinShort")}</p>}
                  <button onClick={() => { setSelected(null); setMessage(null) }}>{t("common.back")}</button>
              </>
          )}

          {message && <p className="error">{message}</p>}

          <div className="kiosk-unlock-footer">
              <button onClick={signInWithPassword}>{t("unlock.usePassword")}</button>
              <Link to="/dashboard">{t("common.cancel")}</Link>
          </div>
      </div>
  )
}

export default KioskUnlock
