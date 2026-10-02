import { Navigate } from "react-router-dom";
import { SignInButton, useAuth } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";

function Home() {
  const { t } = useTranslation()
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
          <p>{t("home.tagline")}</p>
          <SignInButton>
              <button className="primary">{t("home.getStarted")}</button>
          </SignInButton>
      </section>
  )
}

export default Home
