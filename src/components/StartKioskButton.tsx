import { useState } from "react";
import { useApi, useSwitchAccount } from "../lib/kiosk.ts";

// Lets a family admin hand the touch screen over to the family's kiosk account.
function StartKioskButton() {
  const api = useApi()
  const switchAccount = useSwitchAccount()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startKiosk() {
    setStarting(true)
    setError(null)
    try {
      const response = await api("/api/kiosk-session", { method: "POST" })
      if (!response.ok) {
        throw new Error(`Kiosk session request failed (${response.status})`)
      }
      await switchAccount(await response.json())
    } catch (e) {
      console.error(e)
      setError("Couldn't start kiosk mode")
      setStarting(false)
    }
  }

  return (
      <>
          <button className="primary" onClick={startKiosk} disabled={starting}>
              {starting ? "Starting…" : "Start kiosk mode"}
          </button>
          {error && <p className="error">{error}</p>}
      </>
  )
}

export default StartKioskButton
