import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import da from "./locales/da.json";
import en from "./locales/en.json";

// The app's languages. Each has a locale for dates and times ("formats follow the language") and the
// first day of the week (0 = Sunday, 1 = Monday). Adding a language = a new locales/<code>.json file plus
// an entry here (and in CLERK_LOCALIZATIONS in LanguageProvider.tsx, if Clerk has one).
export const LANGUAGES = {
  en: { name: "English", locale: "en-GB", weekStart: 1 },
  da: { name: "Dansk", locale: "da-DK", weekStart: 1 },
} as const

export type Language = keyof typeof LANGUAGES

export const DEFAULT_LANGUAGE: Language = "en"

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && value in LANGUAGES
}

// The best match for the browser's preferred languages, e.g. "da-DK" → "da".
export function browserLanguage(): Language {
  const preferred = typeof navigator === "undefined" ? [] : navigator.languages ?? [navigator.language]
  for (const tag of preferred) {
    const code = tag.toLowerCase().split("-")[0]
    if (isLanguage(code)) {
      return code
    }
  }
  return DEFAULT_LANGUAGE
}

export function currentLanguage(): Language {
  return isLanguage(i18n.language) ? i18n.language : DEFAULT_LANGUAGE
}

// For Intl / toLocale*String: dates, times and weekday names in the current language's format.
export function currentLocale(): string {
  return LANGUAGES[currentLanguage()].locale
}

// Weekdays (0 = Sunday … 6 = Saturday) in display order for the current language.
export function weekdaysInOrder(): number[] {
  const start = LANGUAGES[currentLanguage()].weekStart
  return Array.from({ length: 7 }, (_, i) => (start + i) % 7)
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    da: { translation: da },
  },
  lng: browserLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false }, // React already escapes
})

export default i18n
