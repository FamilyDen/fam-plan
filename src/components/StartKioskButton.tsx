import { useState } from "react";
import { useApi, useSwitchAccount } from "../lib/kiosk.ts";
import { useTranslation } from "react-i18next";

// Lets a family admin turn this device into the family screen (the family's kiosk account).
function StartKioskButton() {
  const { t } = useTranslation()
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
      setError(t("screen.startFailed"))
      setStarting(false)
    }
  }

  return (
      <>
          <button className="primary" onClick={startKiosk} disabled={starting}>
              {starting ? t("screen.starting") : t("screen.start")}
          </button>
          {error && <p className="error">{error}</p>}
      </>
  )
}

export default StartKioskButton
