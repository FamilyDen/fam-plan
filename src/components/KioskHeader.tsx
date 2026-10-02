import { NavLink } from "react-router-dom";
import { useOrganization } from "@clerk/clerk-react";
import { formatLongDate, formatTime } from "../lib/dates.ts";
import { useTranslation } from "react-i18next";

// Header for the family screen: a large clock and date, the family name, and a discreet Unlock button.
function KioskHeader({ now }: { now: Date }) {
  const { t } = useTranslation()
  const { organization } = useOrganization()

  return (
      <header className="kiosk-header">
          <div className="kiosk-clock">
              <time className="kiosk-time" dateTime={now.toISOString()}>
                  {formatTime(now)}
              </time>
              <span className="kiosk-date">
                  {formatLongDate(now)}
              </span>
          </div>
          <div className="kiosk-header-side">
              {organization && <span className="kiosk-family">{organization.name}</span>}
              <nav>
                  <NavLink to="/dashboard">{t("nav.home")}</NavLink>
                  <NavLink to="/family">{t("nav.members")}</NavLink>
                  {/* The kiosk gets no account or family menus; a parent unlocks with their PIN to take over. */}
                  <NavLink to="/kiosk/unlock">{t("nav.unlock")}</NavLink>
              </nav>
          </div>
      </header>
  )
}

export default KioskHeader
