import { useCallback, useEffect, useState } from "react";
import { useOrganization } from "@clerk/clerk-react";
import { useSupabase } from "./supabase.ts";

export type FamilyRole = "parent" | "child"

export type FamilyMember = {
  id: string
  name: string
  role: FamilyRole
  color: string | null
  clerk_user_id: string | null
  created_at: string
}

export type FamilyMemberInput = Pick<FamilyMember, "name" | "role" | "color">

// Colors to tell family members apart at a glance on the shared screen.
export const MEMBER_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899"]

// Members of the active family. Row-level security scopes every query to the active Clerk organization,
// and only family admins can add, change or remove members (the database rejects anyone else).
export function useFamilyMembers() {
  const supabase = useSupabase()
  const { organization } = useOrganization()
  const familyId = organization?.id
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!supabase) {
      setError("Supabase isn't configured (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY)")
      setLoading(false)
      return
    }
    if (!familyId) {
      setMembers([])
      setLoading(false)
      return
    }
    const { data, error } = await supabase
        .from("family_members")
        .select("id, name, role, color, clerk_user_id, created_at")
        .order("role", { ascending: false }) // parents first
        .order("created_at")
    if (error) {
      console.error(error)
      setError("Couldn't load family members")
    } else {
      setMembers(data as FamilyMember[])
      setError(null)
    }
    setLoading(false)
  }, [supabase, familyId])

  useEffect(() => {
    setLoading(true)
    reload()
  }, [reload])

  // Each change runs one write and then reloads; returns an error message, or null on success.
  // Writes select the affected ids: row-level security silently skips rows the user may not change,
  // so zero affected rows counts as a failure too.
  const run = useCallback(async (write: () => PromiseLike<{ data: unknown[] | null, error: unknown }>, failure: string) => {
    const { data, error } = await write()
    if (error || !data?.length) {
      console.error(error ?? "No rows changed")
      return failure
    }
    await reload()
    return null
  }, [reload])

  const add = useCallback((input: FamilyMemberInput) => run(
      () => supabase!.from("family_members").insert(input).select("id"),
      "Couldn't add the family member",
  ), [run, supabase])

  const update = useCallback((id: string, input: FamilyMemberInput) => run(
      () => supabase!.from("family_members").update(input).eq("id", id).select("id"),
      "Couldn't save the changes",
  ), [run, supabase])

  const remove = useCallback((id: string) => run(
      () => supabase!.from("family_members").delete().eq("id", id).select("id"),
      "Couldn't remove the family member",
  ), [run, supabase])

  return { members, loading, error, add, update, remove }
}
