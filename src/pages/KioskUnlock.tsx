import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react";
import PinPad from "../components/PinPad.tsx";
import { useApi, useIsKiosk, useSwitchAccount } from "../lib/kiosk.ts";

type Parent = { userId: string, name: string, imageUrl: string, hasPin: boolean }

type UnlockError = { error: string, attemptsLeft?: number, lockedUntil?: number }

function describeError(result: UnlockError) {
  switch (result.error) {
    case "wrong_pin":
      return `Wrong PIN. ${result.attemptsLeft} attempts left before it's disabled.`
    case "locked": {
      const minutes = Math.max(1, Math.ceil(((result.lockedUntil ?? 0) - Date.now()) / 60000))
      return `Too many wrong attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`
    }
    case "disabled":
      return "This PIN is disabled after too many wrong attempts. Use your password instead."
    case "no_pin":
      return "No PIN set. Use your password instead."
    default:
      return "Couldn't unlock. Try again."
  }
}

// Kiosk only: a parent picks themselves and enters their PIN to take over the screen.
// Kiosk mode stays on until the PIN is verified by the server.
function KioskUnlock() {
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
        .catch(() => setMessage("Couldn't load parents"))
  }, [api, isKiosk])

  if (!isKiosk) {
    return <Navigate to="/dashboard" replace />
  }

  // Ends kiosk mode without a PIN, so a parent must be at hand to sign in; confirm to avoid accidental taps.
  function signInWithPassword() {
    if (window.confirm("This closes the family screen. A parent will need to sign in with their password. Continue?")) {
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
      setMessage("Couldn't unlock. Try again.")
      setBusy(false)
    }
  }

  return (
      <div className="kiosk-unlock">
          <h1>Unlock family screen</h1>

          {!selected && (
              <>
                  <p className="muted">Who's unlocking?</p>
                  {parents === null && !message && <p className="muted">Loading…</p>}
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
                  <p>{selected.name}, enter your PIN</p>
                  {selected.hasPin ? <PinPad onSubmit={unlock} disabled={busy} /> : <p className="muted">No PIN set.</p>}
                  <button onClick={() => { setSelected(null); setMessage(null) }}>Back</button>
              </>
          )}

          {message && <p className="error">{message}</p>}

          <div className="kiosk-unlock-footer">
              <button onClick={signInWithPassword}>Use password instead</button>
              <Link to="/dashboard">Cancel</Link>
          </div>
      </div>
  )
}

export default KioskUnlock
