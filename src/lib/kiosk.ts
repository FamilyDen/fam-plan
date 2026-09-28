import { useAuth, useUser } from "@clerk/clerk-react";

// sessionStorage key used to carry the kiosk sign-in ticket across the parent's sign-out.
export const KIOSK_TICKET_KEY = "famplan.kioskTicket"

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
