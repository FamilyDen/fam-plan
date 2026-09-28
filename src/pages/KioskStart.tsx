import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, useSignIn } from "@clerk/clerk-react";
import { KIOSK_TICKET_KEY } from "../lib/kiosk.ts";

// Signs the touch screen in as the family's kiosk account using the one-time ticket
// that StartKioskButton stored before signing the parent out.
function KioskStart() {
  const { isLoaded, signIn, setActive } = useSignIn()
  const { isSignedIn } = useAuth()
  const navigate = useNavigate()
  const redeemed = useRef(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!isLoaded || redeemed.current) {
      return
    }
    // Tickets are single-use; guard against StrictMode running this effect twice.
    redeemed.current = true

    const stored = sessionStorage.getItem(KIOSK_TICKET_KEY)
    sessionStorage.removeItem(KIOSK_TICKET_KEY)

    if (isSignedIn || !stored) {
      navigate("/", { replace: true })
      return
    }

    const { ticket, familyId } = JSON.parse(stored) as { ticket: string, familyId: string }

    signIn.create({ strategy: "ticket", ticket })
        .then(({ status, createdSessionId }) => {
          if (status !== "complete" || !createdSessionId) {
            throw new Error(`Kiosk sign-in did not complete (${status})`)
          }
          return setActive({ session: createdSessionId, organization: familyId })
        })
        .then(() => navigate("/dashboard", { replace: true }))
        .catch((e) => {
          console.error(e)
          setFailed(true)
        })
  }, [isLoaded, isSignedIn, signIn, setActive, navigate])

  if (failed) {
    return (
        <section className="hero">
            <h1>Kiosk mode didn't start</h1>
            <p>A parent needs to sign in and try again.</p>
            <Link to="/">Back</Link>
        </section>
    )
  }

  return (
      <section className="hero">
          <p className="muted">Starting kiosk mode…</p>
      </section>
  )
}

export default KioskStart
