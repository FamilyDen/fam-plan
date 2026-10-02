import { CreateOrganization, useOrganization, useUser } from "@clerk/clerk-react";
import TodosCard from "../components/TodosCard.tsx";
import WeekCard from "../components/WeekCard.tsx";
import { useFamilyMembers } from "../lib/familyMembers.ts";
import { useIsKiosk } from "../lib/kiosk.ts";

// The family's week and to-dos side by side. Family members are managed on the Family page (header link);
// the cards still use them for avatars and assigning.
function Dashboard() {
  const { user } = useUser()
  const { isLoaded, organization } = useOrganization()
  const isKiosk = useIsKiosk()
  const { members } = useFamilyMembers()
  const name = user?.firstName ?? user?.username ?? "there"

  if (!isLoaded) {
    return null
  }

  // Every family's data is scoped to a Clerk organization, so one must be active.
  if (!organization) {
    return (
        <div className="dashboard">
            <h1>Hi {name} 👋</h1>
            <p className="muted">Create your family to start planning together, or pick one from the menu above.</p>
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
                  <h1>Hi {name} 👋</h1>
                  <p className="muted">
                      {/* The family's name is in the top bar. */}
                      {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
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
