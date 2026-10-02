import { Link, NavLink, Outlet } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton, useOrganization } from "@clerk/clerk-react";
import FieldIcon from "./FieldIcon.tsx";
import KioskHeader from "./KioskHeader.tsx";
import NightScreen from "./NightScreen.tsx";
import SettingsMenu from "./SettingsMenu.tsx";
import { useNow, useWakeLock } from "../lib/display.ts";
import { useFamilySettings } from "../lib/familySettings.ts";
import { useIsKiosk } from "../lib/kiosk.ts";

function Layout() {
  const isKiosk = useIsKiosk()
  useWakeLock(isKiosk)

  // The family screen in the family room: big clock, no account menus, and night dimming.
  if (isKiosk) {
    return <KioskDisplay />
  }

  return (
      <>
          <header className="site-header">
              <FamilyBrand />
              <nav>
                  <SignedIn>
                      {/* On phones these tabs move to the tab bar at the bottom. */}
                      <span className="nav-links nav-tabs">
                          <NavLink to="/dashboard">Home</NavLink>
                          <NavLink to="/family">Members</NavLink>
                      </span>
                      <SettingsMenu />
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
                  <NavLink to="/family"><FieldIcon name="users" size={24} />Members</NavLink>
              </nav>
          </SignedIn>
      </>
  )
}

// The active family's name as the page's context, with FamPlan underneath; just "FamPlan" without a family.
function FamilyBrand() {
  const { organization } = useOrganization()

  if (!organization) {
    return <Link to="/" className="brand">FamPlan</Link>
  }
  return (
      <Link to="/dashboard" className="brand family-brand">
          {organization.hasImage
              ? <img className="family-brand-badge" src={organization.imageUrl} alt="" />
              : <span className="family-brand-badge"><FieldIcon name="home" size={18} /></span>}
          <span className="family-brand-text">
              <span className="family-brand-name">{organization.name}</span>
              <span className="family-brand-app">FamPlan</span>
          </span>
      </Link>
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
