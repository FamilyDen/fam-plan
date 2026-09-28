import { useMemo } from "react";
import { useSession } from "@clerk/clerk-react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to the .env file')
}

// Supabase client that authenticates each request with the current Clerk session token,
// so row-level security policies can use auth.jwt()->>'sub' (the Clerk user id).
export function useSupabase() {
  const { session } = useSession()

  return useMemo(
      () => createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        async accessToken() {
          return (await session?.getToken()) ?? null
        },
      }),
      [session],
  )
}
