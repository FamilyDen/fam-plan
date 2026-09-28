import { Link, NavLink, Outlet } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";

function Layout() {

  return (
      <>
          <header className="site-header">
              <Link to="/" className="brand">FamPlan</Link>
              <nav>
                  <SignedIn>
                      <NavLink to="/dashboard">Dashboard</NavLink>
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

export default Layout
