import { useMemo } from "react";
import { useSession } from "@clerk/clerk-react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Missing config shows up as an error where data is used, instead of crashing the whole app.
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY)

// Supabase client that authenticates each request with the current Clerk session token,
// so row-level security policies can use auth.jwt() (the Clerk user and active family).
// Null when VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are not set.
export function useSupabase() {
  const { session } = useSession()

  return useMemo(
      () => isSupabaseConfigured
          ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            async accessToken() {
              return (await session?.getToken()) ?? null
            },
          })
          : null,
      [session],
  )
}
