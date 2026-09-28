import { useCallback } from "react";
import { useAuth, useClerk, useUser } from "@clerk/clerk-react";

// sessionStorage key that carries a one-time sign-in ticket across a sign-out (see pages/SwitchAccount.tsx).
export const SWITCH_TICKET_KEY = "famplan.switchTicket"

export type SwitchTicket = { ticket: string, familyId: string }

// True when the shared touch screen is signed in as the family's kiosk account.
export function useIsKiosk() {
  const { user } = useUser()
  return user?.publicMetadata?.kiosk === true
}

// True for parents with the admin role in the active family.
export function useIsFamilyAdmin() {
  const { orgRole } = useAuth()
  return orgRole === "org:admin"
}

// fetch() for our /api functions, authenticated with the current Clerk session.
export function useApi() {
  const { getToken } = useAuth()

  return useCallback(async (path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers)
    headers.set("Authorization", `Bearer ${await getToken()}`)
    if (init.body) {
      headers.set("Content-Type", "application/json")
    }
    return fetch(path, { ...init, headers })
  }, [getToken])
}

// Signs out the current account and continues as the account the ticket belongs to.
export function useSwitchAccount() {
  const { signOut } = useClerk()

  return useCallback(async (switchTicket: SwitchTicket) => {
    sessionStorage.setItem(SWITCH_TICKET_KEY, JSON.stringify(switchTicket))
    await signOut({ redirectUrl: "/switch" })
  }, [signOut])
}
