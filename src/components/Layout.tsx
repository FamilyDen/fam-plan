import { Link, NavLink, Outlet } from "react-router-dom";
import { OrganizationSwitcher, SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { useIsFamilyAdmin, useIsKiosk } from "../lib/kiosk.ts";

function Layout() {
  const isKiosk = useIsKiosk()
  const isFamilyAdmin = useIsFamilyAdmin()

  return (
      <>
          <header className="site-header">
              <Link to="/" className="brand">FamPlan</Link>
              <nav>
                  <SignedIn>
                      <NavLink to="/dashboard">Dashboard</NavLink>
                      {isKiosk ? (
                          // The kiosk gets no account or family menus; a parent unlocks with their PIN to take over.
                          <NavLink to="/kiosk/unlock">Parent</NavLink>
                      ) : (
                          <>
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
                          </>
                      )}
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

export default Layout
