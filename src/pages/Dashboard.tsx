import { useUser } from "@clerk/clerk-react";

function Dashboard() {
  const { user } = useUser()
  const name = user?.firstName ?? user?.username ?? "there"

  return (
      <div className="dashboard">
          <h1>Hi {name} 👋</h1>
          <p className="muted">Here's what's happening in your family.</p>

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
