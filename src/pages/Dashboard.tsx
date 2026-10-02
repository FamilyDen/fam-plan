import { CreateOrganization, useOrganization, useUser } from "@clerk/clerk-react";
import TodosCard from "../components/TodosCard.tsx";
import WeekCard from "../components/WeekCard.tsx";
import { useFamilyMembers } from "../lib/familyMembers.ts";
import { formatLongDate } from "../lib/dates.ts";
import { useIsKiosk } from "../lib/kiosk.ts";
import { useTranslation } from "react-i18next";

// The family's week and to-dos side by side. Family members are managed on the Family page (header link);
// the cards still use them for avatars and assigning.
function Dashboard() {
  const { t } = useTranslation()
  const { user } = useUser()
  const { isLoaded, organization } = useOrganization()
  const isKiosk = useIsKiosk()
  const { members } = useFamilyMembers()
  const name = user?.firstName ?? user?.username
  const greeting = name ? t("dashboard.greeting", { name }) : t("dashboard.greetingNoName")

  if (!isLoaded) {
    return null
  }

  // Every family's data is scoped to a Clerk organization, so one must be active.
  if (!organization) {
    return (
        <div className="dashboard">
            <h1>{greeting}</h1>
            <p className="muted">{t("dashboard.createFamily")}</p>
            <div className="create-family">
                <CreateOrganization afterCreateOrganizationUrl="/dashboard" skipInvitationScreen={false} />
            </div>
        </div>
    )
  }

  return (
      <div className="dashboard">
          {/* On the wall screen the clock header takes the greeting's place. */}
          {!isKiosk && (
              <header className="page-header">
                  <h1>{greeting}</h1>
                  <p className="muted">
                      {/* The family's name is in the top bar. */}
                      {formatLongDate(new Date())}
                  </p>
              </header>
          )}

          <div className="dashboard-cards">
              <WeekCard members={members} />
              <TodosCard members={members} />
          </div>
      </div>
  )
}

export default Dashboard
