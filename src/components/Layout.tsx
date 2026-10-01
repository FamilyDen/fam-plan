import { Link, NavLink, Outlet } from "react-router-dom";
import { OrganizationSwitcher, SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import KioskHeader from "./KioskHeader.tsx";
import NightScreen from "./NightScreen.tsx";
import { useNow, useWakeLock } from "../lib/display.ts";
import { useIsFamilyAdmin, useIsKiosk } from "../lib/kiosk.ts";

function Layout() {
  const isKiosk = useIsKiosk()
  const isFamilyAdmin = useIsFamilyAdmin()
  useWakeLock(isKiosk)

  // The family-room wall screen: big clock, no account menus, and night dimming.
  if (isKiosk) {
    return <KioskDisplay />
  }

  return (
      <>
          <header className="site-header">
              <Link to="/" className="brand">FamPlan</Link>
              <nav>
                  <SignedIn>
                      <NavLink to="/dashboard">Dashboard</NavLink>
                      <NavLink to="/family">Family</NavLink>
                      {isFamilyAdmin && <NavLink to="/kiosk" end>Kiosk</NavLink>}
                      <OrganizationSwitcher
                          hidePersonal
                          afterCreateOrganizationUrl="/dashboard"
                          afterSelectOrganizationUrl="/dashboard"
                          // Clerk's default dark text is unreadable on the dark header; follow the page text color instead.
                          appearance={{
                              elements: {
                                  organizationSwitcherTrigger: { color: "inherit" },
                                  organizationSwitcherTriggerIcon: { color: "inherit" },
                                  organizationPreviewMainIdentifier: { color: "inherit" },
                              },
                          }}
                      />
                      <UserButton />
                  </SignedIn>
                  <SignedOut>
                      <SignInButton />
                  </SignedOut>
              </nav>
          </header>
          <main className="site-main">
              <Outlet />
          </main>
      </>
  )
}

function KioskDisplay() {
  const now = useNow()

  return (
      <div className="kiosk-display">
          <KioskHeader now={now} />
          <main className="site-main">
              <Outlet />
          </main>
          <NightScreen now={now} />
      </div>
  )
}

export default Layout
