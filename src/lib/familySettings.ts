import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useOrganization } from "@clerk/clerk-react";
import { useLiveRefresh } from "./realtime.ts";
import { useSupabase } from "./supabase.ts";
import i18n, { isLanguage, type Language } from "../i18n/index.ts";

export type FamilySettings = {
  nightMode: boolean
  nightStart: string // "22:00", local time
  nightEnd: string // "06:00"; may be before nightStart (crosses midnight)
  language: Language | null // null = not chosen yet: follow the browser
}

// Used until a parent saves settings (and when they can't be loaded, so the family screen still works).
export const DEFAULT_SETTINGS: FamilySettings = { nightMode: true, nightStart: "22:00", nightEnd: "06:00", language: null }

type SettingsRow = { night_mode: boolean, night_start: string, night_end: string, language: string | null }

const COLUMNS = "night_mode, night_start, night_end, language"

function fromRow(row: SettingsRow): FamilySettings {
  return {
    nightMode: row.night_mode,
    // Postgres returns times as "22:00:00".
    nightStart: row.night_start.slice(0, 5),
    nightEnd: row.night_end.slice(0, 5),
    language: isLanguage(row.language) ? row.language : null,
  }
}

export type FamilySettingsState = {
  settings: FamilySettings
  loading: boolean
  save: (settings: FamilySettings) => Promise<string | null>
}

// Shared by everything that needs the settings (night mode, the language, the settings pages), so they're
// loaded once; see components/FamilySettingsProvider.tsx.
export const FamilySettingsContext = createContext<FamilySettingsState | null>(null)

export function useFamilySettings() {
  const state = useContext(FamilySettingsContext)
  if (!state) {
    throw new Error("useFamilySettings must be used inside <FamilySettingsProvider>")
  }
  return state
}

// Loads and saves the active family's settings (family_settings). Everyone in the family, including the
// family screen, can read them; only family admins (parents) can save them, which row-level security enforces.
export function useFamilySettingsSource(): FamilySettingsState {
  const supabase = useSupabase()
  const { organization } = useOrganization()
  const familyId = organization?.id
  const [settings, setSettings] = useState<FamilySettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!supabase || !familyId) {
      setSettings(DEFAULT_SETTINGS)
      setLoading(false)
      return
    }
    const { data, error } = await supabase.from("family_settings").select(COLUMNS).maybeSingle()
    if (error) {
      console.error(error)
    } else {
      setSettings(data ? fromRow(data) : DEFAULT_SETTINGS)
    }
    setLoading(false)
  }, [supabase, familyId])

  useEffect(() => {
    reload()
  }, [reload])

  // A parent changing the settings shows up on the family screen right away.
  useLiveRefresh(supabase, familyId, [{ table: "family_settings", byFamily: true }], reload)

  // Saves the settings (creating the family's row the first time). Returns an error message, or null.
  const save = useCallback(async (next: FamilySettings) => {
    const { data, error } = await supabase!
        .from("family_settings")
        .upsert(
            {
              family_id: familyId,
              night_mode: next.nightMode,
              night_start: next.nightStart,
              night_end: next.nightEnd,
              language: next.language,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "family_id" },
        )
        .select(COLUMNS)
    if (error || !data?.length) {
      console.error(error ?? "No rows changed")
      return i18n.t("errors.saveSettings")
    }
    setSettings(fromRow(data[0]))
    return null
  }, [supabase, familyId])

  return { settings, loading, save }
}
