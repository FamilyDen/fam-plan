import { useState } from "react";
import { useAuth, useClerk } from "@clerk/clerk-react";
import { KIOSK_TICKET_KEY } from "../lib/kiosk.ts";

// Lets a family admin hand the touch screen over to the family's kiosk account.
// The parent is signed out, then /kiosk/start signs in as the kiosk with a one-time ticket.
function StartKioskButton() {
  const { getToken } = useAuth()
  const { signOut } = useClerk()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startKiosk() {
    setStarting(true)
    setError(null)
    try {
      const response = await fetch("/api/kiosk-session", {
        method: "POST",
        headers: { Authorization: `Bearer ${await getToken()}` },
      })
      if (!response.ok) {
        throw new Error(`Kiosk session request failed (${response.status})`)
      }
      const { ticket, familyId } = await response.json()
      sessionStorage.setItem(KIOSK_TICKET_KEY, JSON.stringify({ ticket, familyId }))
      await signOut({ redirectUrl: "/kiosk/start" })
    } catch (e) {
      console.error(e)
      setError("Couldn't start kiosk mode")
      setStarting(false)
    }
  }

  return (
      <>
          <button onClick={startKiosk} disabled={starting}>
              {starting ? "Starting…" : "Start kiosk mode"}
          </button>
          {error && <span className="error">{error}</span>}
      </>
  )
}

export default StartKioskButton
