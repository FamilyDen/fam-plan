import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useClerk, useOrganization, useOrganizationList, useUser } from "@clerk/clerk-react";
import FieldIcon, { type IconName } from "./FieldIcon.tsx";
import { LANGUAGES, isLanguage, type Language } from "../i18n/index.ts";
import { useFamilySettings } from "../lib/familySettings.ts";
import { useIsFamilyAdmin } from "../lib/kiosk.ts";
import { useTranslation } from "react-i18next";

// The one menu in the top bar, opened from your avatar (with a small ⚙ badge): who you are, family actions,
// and your account — replacing Clerk's own avatar menu. Grouped in sections, so new options can be added
// as another <MenuItem> (or section) later. Parents see the admin items; switching only appears with
// more than one family.
function SettingsMenu() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<"main" | "language">("main")
  const root = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const clerk = useClerk()
  const isFamilyAdmin = useIsFamilyAdmin()
  const { organization } = useOrganization()
  const { user } = useUser()
  const { userMemberships, setActive } = useOrganizationList({ userMemberships: true })
  const families = userMemberships?.data?.map((m) => m.organization) ?? []
  const { settings, save: saveSettings } = useFamilySettings()
  const personalLanguage = isLanguage(user?.unsafeMetadata?.language) ? user.unsafeMetadata.language : null
  const activeLanguage = personalLanguage ?? settings.language

  // Close on a click outside or Escape.
  useEffect(() => {
    if (!open) {
      setView("main")
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
              aria-label={t("menu.open")}
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
                              <div className="settings-menu-user-name">{user.fullName ?? user.username ?? t("menu.you")}</div>
                              <div className="settings-menu-user-email">{user.primaryEmailAddress?.emailAddress}</div>
                          </div>
                      </div>
                  )}

                  {view === "language" ? (
                      <LanguageView
                          personal={personalLanguage}
                          family={settings.language}
                          canSetFamily={isFamilyAdmin && !!organization}
                          onBack={() => setView("main")}
                          onPersonal={(language) => user?.update({ unsafeMetadata: { ...user.unsafeMetadata, language } })}
                          onFamily={(language) => saveSettings({ ...settings, language })}
                      />
                  ) : (
                  <>
                  {organization && <div className="settings-menu-heading">{organization.name}</div>}

                  {isFamilyAdmin && (
                      <MenuSection>
                          <MenuItem icon="tablet" onSelect={() => run(() => navigate("/kiosk"))}>{t("menu.familyScreen")}</MenuItem>
                          <MenuItem icon="userPlus" onSelect={() => run(() => clerk.openOrganizationProfile())}>
                              {t("menu.parentsInvites")}
                          </MenuItem>
                      </MenuSection>
                  )}

                  {families.length > 1 && (
                      <MenuSection title={t("menu.switchFamily")}>
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
                          {t("menu.createFamily")}
                      </MenuItem>
                  </MenuSection>

                  <MenuSection>
                      <MenuItem icon="language" onSelect={() => setView("language")}>
                          {t("menu.language")}
                          <span className="settings-menu-value">{activeLanguage ? LANGUAGES[activeLanguage].name : t("language.automatic")}</span>
                      </MenuItem>
                  </MenuSection>

                  <MenuSection>
                      <MenuItem icon="user" onSelect={() => run(() => clerk.openUserProfile())}>{t("menu.manageAccount")}</MenuItem>
                      <MenuItem icon="logout" onSelect={() => run(() => clerk.signOut({ redirectUrl: "/" }))}>{t("menu.signOut")}</MenuItem>
                  </MenuSection>
                  </>
                  )}
              </div>
          )}
      </div>
  )
}

type LanguageViewProps = {
  personal: Language | null
  family: Language | null
  canSetFamily: boolean
  onBack: () => void
  onPersonal: (language: Language | null) => void
  onFamily: (language: Language) => void
}

// Your own language (or "Same as family"), and for parents the family's language, which the family screen uses.
function LanguageView({ personal, family, canSetFamily, onBack, onPersonal, onFamily }: LanguageViewProps) {
  const { t } = useTranslation()
  const codes = Object.keys(LANGUAGES) as Language[]
  const familyName = family ? LANGUAGES[family].name : t("language.automatic")

  return (
      <>
          <button type="button" className="settings-menu-back" onClick={onBack}>
              <FieldIcon name="chevronLeft" />{t("menu.language")}
          </button>
          <MenuSection title={t("language.yours")}>
              <MenuItem icon={personal === null ? "check" : undefined} onSelect={() => onPersonal(null)}>
                  {t("language.sameAsFamily", { language: familyName })}
              </MenuItem>
              {codes.map((code) => (
                  <MenuItem key={code} icon={personal === code ? "check" : undefined} onSelect={() => onPersonal(code)}>
                      {LANGUAGES[code].name}
                  </MenuItem>
              ))}
          </MenuSection>
          {canSetFamily && (
              <MenuSection title={t("language.family")}>
                  {codes.map((code) => (
                      <MenuItem key={code} icon={family === code ? "check" : undefined} onSelect={() => onFamily(code)}>
                          {LANGUAGES[code].name}
                      </MenuItem>
                  ))}
                  <p className="settings-menu-note">{t("language.familyNote")}</p>
              </MenuSection>
          )}
      </>
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
