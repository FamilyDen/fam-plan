import { CreateOrganization, useOrganization, useUser } from "@clerk/clerk-react";

function Dashboard() {
  const { user } = useUser()
  const { isLoaded, organization } = useOrganization()
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
                  <ul className="members">
                      <li>
                          {user?.imageUrl && <img src={user.imageUrl} alt="" />}
                          <span>{user?.fullName ?? name} (you)</span>
                      </li>
                  </ul>
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
