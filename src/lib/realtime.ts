import { useEffect, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

// Tables a card shows. Tables with a family_id column are filtered to the active family on the server;
// others (event_members) get every change Supabase lets this user see under row-level security.
type LiveTable = { table: string, byFamily: boolean }

const DEBOUNCE_MS = 250
// Safety net for a kiosk tablet that slept or lost its connection and missed changes.
const FALLBACK_REFRESH_MS = 5 * 60 * 1000

// Calls reload() whenever another screen changes one of the tables (via Supabase Realtime),
// when this screen becomes visible or comes back online, and every few minutes as a fallback.
// Bursts of changes are debounced into one reload.
export function useLiveRefresh(
    supabase: SupabaseClient | null,
    familyId: string | undefined,
    tables: LiveTable[],
    reload: () => void,
) {
  const reloadRef = useRef(reload)
  reloadRef.current = reload
  const tablesKey = tables.map((t) => `${t.table}:${t.byFamily}`).join(",")

  useEffect(() => {
    if (!supabase || !familyId) {
      return
    }

    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = () => {
      clearTimeout(timer)
      timer = setTimeout(() => reloadRef.current(), DEBOUNCE_MS)
    }

    // Unique topic per subscription, so cards showing the same table don't share (and close) a channel.
    const channel = supabase.channel(`family:${familyId}:${tablesKey}:${crypto.randomUUID()}`)
    for (const spec of tablesKey.split(",")) {
      const [table, byFamily] = spec.split(":")
      channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table, ...(byFamily === "true" ? { filter: `family_id=eq.${familyId}` } : {}) },
          refresh,
      )
    }
    channel.subscribe((status) => {
      // Catch up on anything missed while (re)connecting.
      if (status === "SUBSCRIBED") {
        refresh()
      }
    })

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refresh()
      }
    }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("online", refresh)
    const fallback = setInterval(refresh, FALLBACK_REFRESH_MS)

    return () => {
      clearTimeout(timer)
      clearInterval(fallback)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("online", refresh)
      supabase.removeChannel(channel)
    }
  }, [supabase, familyId, tablesKey])
}
