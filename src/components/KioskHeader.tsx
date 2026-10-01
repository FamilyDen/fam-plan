import { NavLink } from "react-router-dom";
import { useOrganization } from "@clerk/clerk-react";

const LOCALE = "en-GB"

// Header for the wall screen: a large clock and date, the family name, and a discreet Parent button.
function KioskHeader({ now }: { now: Date }) {
  const { organization } = useOrganization()

  return (
      <header className="kiosk-header">
          <div className="kiosk-clock">
              <time className="kiosk-time" dateTime={now.toISOString()}>
                  {now.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}
              </time>
              <span className="kiosk-date">
                  {now.toLocaleDateString(LOCALE, { weekday: "long", day: "numeric", month: "long" })}
              </span>
          </div>
          <div className="kiosk-header-side">
              {organization && <span className="kiosk-family">{organization.name}</span>}
              <nav>
                  <NavLink to="/dashboard">Home</NavLink>
                  <NavLink to="/family">Family</NavLink>
                  {/* The kiosk gets no account or family menus; a parent unlocks with their PIN to take over. */}
                  <NavLink to="/kiosk/unlock">Parent</NavLink>
              </nav>
          </div>
      </header>
  )
}

export default KioskHeader
