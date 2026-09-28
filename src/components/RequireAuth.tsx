import type { ReactNode } from "react";
import { RedirectToSignIn, useAuth } from "@clerk/clerk-react";

// Renders children only for signed-in users; otherwise sends them to Clerk's sign-in.
function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return null
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />
  }

  return children
}

export default RequireAuth
