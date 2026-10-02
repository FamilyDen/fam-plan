import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useClerk, useOrganization, useOrganizationList, useUser } from "@clerk/clerk-react";
import FieldIcon, { type IconName } from "./FieldIcon.tsx";
import { useIsFamilyAdmin } from "../lib/kiosk.ts";

// The one menu in the top bar, opened from your avatar (with a small ⚙ badge): who you are, family actions,
// and your account — replacing Clerk's own avatar menu. Grouped in sections, so new options can be added
// as another <MenuItem> (or section) later. Parents see the admin items; switching only appears with
// more than one family.
function SettingsMenu() {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const clerk = useClerk()
  const isFamilyAdmin = useIsFamilyAdmin()
  const { organization } = useOrganization()
  const { user } = useUser()
  const { userMemberships, setActive } = useOrganizationList({ userMemberships: true })
  const families = userMemberships?.data?.map((m) => m.organization) ?? []

  // Close on a click outside or Escape.
  useEffect(() => {
    if (!open) {
      return
    }
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("pointerdown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  function run(action: () => void) {
    setOpen(false)
    action()
  }

  return (
      <div className="settings-menu" ref={root}>
          <button
              type="button"
              className="settings-menu-button"
              aria-label="Account and settings"
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
          >
              {user?.imageUrl
                  ? <img className="settings-menu-avatar" src={user.imageUrl} alt="" />
                  : <span className="settings-menu-avatar"><FieldIcon name="user" /></span>}
              <span className="settings-menu-badge" aria-hidden><FieldIcon name="settings" size={11} /></span>
          </button>

          {open && (
              <div className="settings-menu-panel" role="menu">
                  {user && (
                      <div className="settings-menu-user">
                          {user.imageUrl && <img src={user.imageUrl} alt="" />}
                          <div>
                              <div className="settings-menu-user-name">{user.fullName ?? user.username ?? "You"}</div>
                              <div className="settings-menu-user-email">{user.primaryEmailAddress?.emailAddress}</div>
                          </div>
                      </div>
                  )}

                  {organization && <div className="settings-menu-heading">{organization.name}</div>}

                  {isFamilyAdmin && (
                      <MenuSection>
                          <MenuItem icon="tablet" onSelect={() => run(() => navigate("/kiosk"))}>Family screen</MenuItem>
                          <MenuItem icon="userPlus" onSelect={() => run(() => clerk.openOrganizationProfile())}>
                              Parents &amp; invites
                          </MenuItem>
                      </MenuSection>
                  )}

                  {families.length > 1 && (
                      <MenuSection title="Switch family">
                          {families.map((family) => (
                              <MenuItem
                                  key={family.id}
                                  icon={family.id === organization?.id ? "check" : undefined}
                                  onSelect={() => run(() => {
                                    if (family.id !== organization?.id) {
                                      setActive?.({ organization: family.id }).then(() => navigate("/dashboard"))
                                    }
                                  })}
                              >
                                  {family.name}
                              </MenuItem>
                          ))}
                      </MenuSection>
                  )}

                  <MenuSection>
                      <MenuItem icon="plus" onSelect={() => run(() => clerk.openCreateOrganization({ afterCreateOrganizationUrl: "/dashboard" }))}>
                          Create a family
                      </MenuItem>
                  </MenuSection>

                  <MenuSection>
                      <MenuItem icon="user" onSelect={() => run(() => clerk.openUserProfile())}>Manage account</MenuItem>
                      <MenuItem icon="logout" onSelect={() => run(() => clerk.signOut({ redirectUrl: "/" }))}>Sign out</MenuItem>
                  </MenuSection>
              </div>
          )}
      </div>
  )
}

function MenuSection({ title, children }: { title?: string, children: ReactNode }) {
  return (
      <div className="settings-menu-section" role="group" aria-label={title}>
          {title && <div className="settings-menu-title">{title}</div>}
          {children}
      </div>
  )
}

function MenuItem({ icon, onSelect, children }: { icon?: IconName, onSelect: () => void, children: ReactNode }) {
  return (
      <button type="button" role="menuitem" className="settings-menu-item" onClick={onSelect}>
          <span className="settings-menu-icon">{icon && <FieldIcon name={icon} />}</span>
          {children}
      </button>
  )
}

export default SettingsMenu
