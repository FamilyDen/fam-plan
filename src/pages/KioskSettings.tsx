import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import PinPad from "../components/PinPad.tsx";
import StartKioskButton from "../components/StartKioskButton.tsx";
import { useApi, useIsFamilyAdmin } from "../lib/kiosk.ts";

type PinStatus = { hasPin: boolean, disabled: boolean }

// For family admins: set the PIN used to unlock the kiosk, and start kiosk mode on this screen.
function KioskSettings() {
  const isFamilyAdmin = useIsFamilyAdmin()
  const api = useApi()
  const [status, setStatus] = useState<PinStatus | null>(null)
  const [editing, setEditing] = useState(false)
  const [firstPin, setFirstPin] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isFamilyAdmin) {
      return
    }
    api("/api/kiosk-pin")
        .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
        .then(setStatus)
        .catch(() => setMessage("Couldn't load your PIN status"))
  }, [api, isFamilyAdmin])

  if (!isFamilyAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  async function savePin(pin: string) {
    if (firstPin === null) {
      setFirstPin(pin)
      setMessage("Enter the same PIN again to confirm")
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
    setStatus(await response.json())
    setEditing(false)
    setMessage("PIN saved")
  }

  return (
      <div className="kiosk-settings">
          <h1>Kiosk mode</h1>
          <p className="muted">
              Kiosk mode turns this screen into the family's shared screen. Kids can use it without logging in,
              and parents unlock it with their PIN.
          </p>

          <section className="card">
              <h2>Your unlock PIN</h2>
              {status === null && !message && <p className="muted">Loading…</p>}
              {status && !editing && (
                  <>
                      <p>
                          {status.disabled
                              ? "Your PIN was disabled after too many wrong attempts. Set a new one."
                              : status.hasPin ? "Your PIN is set." : "You haven't set a PIN yet."}
                      </p>
                      <button onClick={() => { setEditing(true); setMessage(null) }}>
                          {status.hasPin && !status.disabled ? "Change PIN" : "Set PIN"}
                      </button>
                  </>
              )}
              {editing && (
                  <>
                      <p>{firstPin === null ? "Enter a new PIN (4–8 digits)" : "Confirm your PIN"}</p>
                      <PinPad onSubmit={savePin} />
                      <button onClick={() => { setEditing(false); setFirstPin(null); setMessage(null) }}>Cancel</button>
                  </>
              )}
              {message && <p className="muted">{message}</p>}
          </section>

          <section className="card">
              <h2>Start kiosk mode</h2>
              {status && (!status.hasPin || status.disabled) && (
                  <p className="error">Set your PIN first; otherwise you'll need your password to leave kiosk mode.</p>
              )}
              <StartKioskButton />
          </section>
      </div>
  )
}

export default KioskSettings
