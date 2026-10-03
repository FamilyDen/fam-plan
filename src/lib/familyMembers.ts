import { useCallback, useEffect, useState } from "react";
import { useOrganization } from "@clerk/clerk-react";
import { useLiveRefresh } from "./realtime.ts";
import { useSupabase } from "./supabase.ts";
import i18n from "../i18n/index.ts";

export type FamilyRole = "parent" | "child"

export type FamilyMember = {
  id: string
  name: string
  role: FamilyRole
  color: string | null
  clerk_user_id: string | null
  weekly_star_goal: number | null // chores: stars to collect each week (null = no goal)
  weekly_reward: string | null // what reaching the goal earns, e.g. "Movie night pick"
  created_at: string
}

export type FamilyMemberInput = Pick<FamilyMember, "name" | "role" | "color">
    & Partial<Pick<FamilyMember, "weekly_star_goal" | "weekly_reward">>

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
      setError(i18n.t("errors.supabaseConfig"))
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
        .select("id, name, role, color, clerk_user_id, weekly_star_goal, weekly_reward, created_at")
        .order("role", { ascending: false }) // parents first
        .order("created_at")
    if (error) {
      console.error(error)
      setError(i18n.t("errors.loadMembers"))
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

  // Other screens' changes (e.g. a to-do ticked on a parent's phone) show up here without a reload.
  useLiveRefresh(supabase, familyId, [{ table: "family_members", byFamily: true }], reload)

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
      i18n.t("errors.addMember"),
  ), [run, supabase])

  const update = useCallback((id: string, input: FamilyMemberInput) => run(
      () => supabase!.from("family_members").update(input).eq("id", id).select("id"),
      i18n.t("errors.saveMember"),
  ), [run, supabase])

  const remove = useCallback((id: string) => run(
      () => supabase!.from("family_members").delete().eq("id", id).select("id"),
      i18n.t("errors.removeMember"),
  ), [run, supabase])

  return { members, loading, error, add, update, remove }
}
