import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider, useUser } from "@clerk/clerk-react";
import i18n, { browserLanguage, currentLanguage, isLanguage, type Language } from "../i18n/index.ts";
import { FamilySettingsContext, useFamilySettings, useFamilySettingsSource } from "../lib/familySettings.ts";

type ClerkLocalization = NonNullable<ComponentProps<typeof ClerkProvider>["localization"]>

// Clerk's own screens (sign-in, account, family settings) in the app's language; English is Clerk's default.
// Loaded only when that language is used, so other languages don't make everyone's download bigger.
const CLERK_LOCALIZATIONS: Partial<Record<Language, () => Promise<ClerkLocalization>>> = {
  da: () => import("@clerk/localizations/da-DK").then((m) => m.daDK),
}

type AppProvidersProps = { publishableKey: string, children: ReactNode }

// Clerk (in the current language), the router, the shared family settings, and the language choice.
function AppProviders({ publishableKey, children }: AppProvidersProps) {
  const [language, setLanguage] = useState<Language>(currentLanguage())
  const [localization, setLocalization] = useState<ClerkLocalization | undefined>(undefined)

  useEffect(() => {
    let current = true
    const load = CLERK_LOCALIZATIONS[language]
    if (!load) {
      setLocalization(undefined)
      return
    }
    load().then((loaded) => current && setLocalization(loaded))
    return () => {
      current = false
    }
  }, [language])

  return (
      <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/" localization={localization}>
          <BrowserRouter>
              <FamilySettingsProvider>
                  <LanguageSync onChange={setLanguage} />
                  {children}
              </FamilySettingsProvider>
          </BrowserRouter>
      </ClerkProvider>
  )
}

function FamilySettingsProvider({ children }: { children: ReactNode }) {
  const state = useFamilySettingsSource()
  return <FamilySettingsContext.Provider value={state}>{children}</FamilySettingsContext.Provider>
}

// Picks the language: your own choice (on your Clerk account), else the family's, else the browser's.
// The family screen has no own choice, so it follows the family.
function LanguageSync({ onChange }: { onChange: (language: Language) => void }) {
  const { user } = useUser()
  const { settings } = useFamilySettings()
  const personal = user?.unsafeMetadata?.language
  const language = isLanguage(personal) ? personal : settings.language ?? browserLanguage()

  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language)
    }
    document.documentElement.lang = language
    onChange(language)
  }, [language, onChange])

  return null
}

export default AppProviders
