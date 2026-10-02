import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useClerk, useOrganization, useOrganizationList } from "@clerk/clerk-react";
import FieldIcon, { type IconName } from "./FieldIcon.tsx";
import { useIsFamilyAdmin } from "../lib/kiosk.ts";

// The ⚙ dropdown in the top bar: family-level actions grouped in sections, so new options can be added
// as another <MenuItem> (or section) later. Parents see the admin items; switching only appears with
// more than one family.
function SettingsMenu() {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const clerk = useClerk()
  const isFamilyAdmin = useIsFamilyAdmin()
  const { organization } = useOrganization()
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
              className="icon-button settings-menu-button"
              aria-label="Settings"
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
          >
              <FieldIcon name="settings" size={22} />
          </button>

          {open && (
              <div className="settings-menu-panel" role="menu">
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
