import { Link } from "react-router-dom";
import { CreateOrganization, useOrganization, useUser } from "@clerk/clerk-react";
import MemberAvatar from "../components/MemberAvatar.tsx";
import { useFamilyMembers } from "../lib/familyMembers.ts";
import { useIsFamilyAdmin } from "../lib/kiosk.ts";

function Dashboard() {
  const { user } = useUser()
  const { isLoaded, organization } = useOrganization()
  const isFamilyAdmin = useIsFamilyAdmin()
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
          <h1>Hi {name} 👋</h1>
          <p className="muted">Here's what's happening in {organization.name}.</p>

          <div className="cards">
              <section className="card">
                  <h2>This week</h2>
                  <p className="muted">No events planned yet.</p>
              </section>

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

              <section className="card">
                  <h2>To-dos</h2>
                  <p className="muted">Nothing on the list.</p>
              </section>
          </div>
      </div>
  )
}

export default Dashboard
