import { Navigate } from "react-router-dom";
import { SignInButton, useAuth } from "@clerk/clerk-react";

function Home() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return null
  }

  if (isSignedIn) {
    return <Navigate to="/dashboard" replace />
  }

  return (
      <section className="hero">
          <h1>FamPlan</h1>
          <p>Plan the week together — schedules, chores and to-dos for the whole family in one place.</p>
          <SignInButton>
              <button className="primary">Get started</button>
          </SignInButton>
      </section>
  )
}

export default Home
