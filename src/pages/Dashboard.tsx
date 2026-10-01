import { Link } from "react-router-dom";
import { CreateOrganization, useOrganization, useUser } from "@clerk/clerk-react";
import MemberAvatar from "../components/MemberAvatar.tsx";
import TodosCard from "../components/TodosCard.tsx";
import WeekCard from "../components/WeekCard.tsx";
import { useFamilyMembers } from "../lib/familyMembers.ts";
import { useIsFamilyAdmin, useIsKiosk } from "../lib/kiosk.ts";

function Dashboard() {
  const { user } = useUser()
  const { isLoaded, organization } = useOrganization()
  const isFamilyAdmin = useIsFamilyAdmin()
  const isKiosk = useIsKiosk()
  const { members, loading, error } = useFamilyMembers()
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
              <>
                  <h1>Hi {name} 👋</h1>
                  <p className="muted">Here's what's happening in {organization.name}.</p>
              </>
          )}

          <div className="cards">
              <WeekCard members={members} />

              <section className="card">
                  <h2>Family members</h2>
                  {error && <p className="error">{error}</p>}
                  {loading && !error && <p className="muted">Loading…</p>}
                  {!loading && !error && members.length === 0 && <p className="muted">No family members yet.</p>}
                  <ul className="members">
                      {members.map((member) => (
                          <li key={member.id}>
                              <MemberAvatar member={member} size={28} />
                              <span>{member.name}</span>
                          </li>
                      ))}
                  </ul>
                  <Link to="/family">{isFamilyAdmin ? "Manage family" : "See everyone"}</Link>
              </section>

              <TodosCard members={members} />
          </div>
      </div>
  )
}

export default Dashboard
