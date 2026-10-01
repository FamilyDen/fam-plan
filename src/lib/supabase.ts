import { useMemo } from "react";
import { useSession } from "@clerk/clerk-react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Missing config shows up as an error where data is used, instead of crashing the whole app.
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY)

type ClerkSession = ReturnType<typeof useSession>["session"]

// One client per signed-in Clerk session, shared by every card so they also share one Realtime connection.
// Each request (and the Realtime connection) asks for a fresh Clerk token, so row-level security policies
// can use auth.jwt() (the Clerk user and active family).
let latestSession: ClerkSession = null
let shared: { sessionId: string | null, client: SupabaseClient } | null = null

function clientFor(sessionId: string | null) {
  if (shared?.sessionId !== sessionId) {
    shared?.client.removeAllChannels()
    shared = {
      sessionId,
      client: createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        async accessToken() {
          return (await latestSession?.getToken()) ?? null
        },
      }),
    }
  }
  return shared.client
}

// Null when VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are not set.
export function useSupabase() {
  const { session } = useSession()
  latestSession = session
  const sessionId = session?.id ?? null

  return useMemo(() => (isSupabaseConfigured ? clientFor(sessionId) : null), [sessionId])
}
