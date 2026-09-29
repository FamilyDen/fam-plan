import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, useSignIn } from "@clerk/clerk-react";
import { SWITCH_TICKET_KEY, type SwitchTicket } from "../lib/kiosk.ts";

// Finishes an account switch on the shared touch screen (parent -> kiosk, or kiosk -> parent):
// signs in with the one-time ticket that useSwitchAccount stored before signing the previous account out.
function SwitchAccount() {
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

    const stored = sessionStorage.getItem(SWITCH_TICKET_KEY)
    sessionStorage.removeItem(SWITCH_TICKET_KEY)

    if (isSignedIn || !stored) {
      navigate("/", { replace: true })
      return
    }

    const { ticket, familyId } = JSON.parse(stored) as SwitchTicket

    signIn.create({ strategy: "ticket", ticket })
        .then(({ status, createdSessionId }) => {
          if (status !== "complete" || !createdSessionId) {
            throw new Error(`Ticket sign-in did not complete (${status})`)
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
            <h1>Couldn't switch accounts</h1>
            <p>A parent needs to sign in and try again.</p>
            <Link to="/dashboard">Sign in</Link>
        </section>
    )
  }

  return (
      <section className="hero">
          <p className="muted">Switching…</p>
      </section>
  )
}

export default SwitchAccount
