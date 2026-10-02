import { Link, NavLink, Outlet } from "react-router-dom";
import { OrganizationSwitcher, SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import FieldIcon from "./FieldIcon.tsx";
import KioskHeader from "./KioskHeader.tsx";
import NightScreen from "./NightScreen.tsx";
import { useNow, useWakeLock } from "../lib/display.ts";
import { useFamilySettings } from "../lib/familySettings.ts";
import { useIsFamilyAdmin, useIsKiosk } from "../lib/kiosk.ts";

function Layout() {
  const isKiosk = useIsKiosk()
  const isFamilyAdmin = useIsFamilyAdmin()
  useWakeLock(isKiosk)

  // The family screen in the family room: big clock, no account menus, and night dimming.
  if (isKiosk) {
    return <KioskDisplay />
  }

  return (
      <>
          <header className="site-header">
              <Link to="/" className="brand">FamPlan</Link>
              <nav>
                  <SignedIn>
                      {/* On phones these links move to the tab bar at the bottom. */}
                      <span className="nav-links">
                          <NavLink to="/dashboard">Dashboard</NavLink>
                          <NavLink to="/family">Family</NavLink>
                          {isFamilyAdmin && <NavLink to="/kiosk" end>Family screen</NavLink>}
                      </span>
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
          <SignedIn>
              <nav className="tab-bar" aria-label="Main">
                  <NavLink to="/dashboard"><FieldIcon name="home" size={24} />Home</NavLink>
                  <NavLink to="/family"><FieldIcon name="users" size={24} />Family</NavLink>
                  {isFamilyAdmin && <NavLink to="/kiosk" end><FieldIcon name="tablet" size={24} />Screen</NavLink>}
              </nav>
          </SignedIn>
      </>
  )
}

function KioskDisplay() {
  const now = useNow()
  const { settings } = useFamilySettings()

  return (
      <div className="kiosk-display">
          <KioskHeader now={now} />
          <main className="site-main">
              <Outlet />
          </main>
          <NightScreen now={now} settings={settings} />
      </div>
  )
}

export default Layout
