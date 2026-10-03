import { useCallback, useEffect, useMemo, useState } from "react";
import { useOrganization } from "@clerk/clerk-react";
import i18n, { LANGUAGES, currentLanguage } from "../i18n/index.ts";
import { addDays, startOfDay, toDateInput } from "./dates.ts";
import { useLiveRefresh } from "./realtime.ts";
import { useSupabase } from "./supabase.ts";

// Chores with stars (see supabase/migrations/20261005000000_chores.sql): recurring chores per member,
// ticked off per day, earning stars towards a weekly goal.

export type Chore = {
  id: string
  title: string
  stars: number // 1–3
  weekdays: number[] // 0 = Sunday … 6 = Saturday
  member_ids: string[]
}

export type ChoreInput = Pick<Chore, "title" | "stars" | "weekdays" | "member_ids">

export type ChoreCompletion = { chore_id: string, member_id: string, done_on: string, stars: number }

// ---- Pure helpers (unit-tested in chores.test.ts)

// The first day of the week containing `date`, for a week starting on `weekStart` (0 = Sunday, 1 = Monday).
export function startOfWeek(date: Date, weekStart: number) {
  const back = (date.getDay() - weekStart + 7) % 7
  return addDays(startOfDay(date), -back)
}

// The chores a member has on a given day.
export function choresFor(chores: Chore[], memberId: string, day: Date) {
  return chores.filter((c) => c.member_ids.includes(memberId) && c.weekdays.includes(day.getDay()))
}

export function isDone(completions: ChoreCompletion[], choreId: string, memberId: string, day: Date) {
  const date = toDateInput(day)
  return completions.some((c) => c.chore_id === choreId && c.member_id === memberId && c.done_on === date)
}

// Stars a member earned in the given completions (e.g. this week's).
export function starsFor(completions: ChoreCompletion[], memberId: string) {
  return completions.filter((c) => c.member_id === memberId).reduce((sum, c) => sum + c.stars, 0)
}

// Stars per day of the week for a member, in week order (7 numbers).
export function starsByDay(completions: ChoreCompletion[], memberId: string, weekStart: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = toDateInput(addDays(weekStart, i))
    return completions.filter((c) => c.member_id === memberId && c.done_on === date).reduce((sum, c) => sum + c.stars, 0)
  })
}

// ---- Data

type ChoreRow = Omit<Chore, "member_ids"> & { chore_members: { member_id: string }[] }

const CHORE_TABLES = [
  { table: "chores", byFamily: true },
  { table: "chore_members", byFamily: false }, // no family_id; row-level security limits what reaches this screen
  { table: "chore_completions", byFamily: true },
]

// The active family's chores and this week's completions. Everyone in the family (including the family
// screen) can tick chores off; only parents can add, change or delete chores (row-level security).
export function useChores(today: Date) {
  const supabase = useSupabase()
  const { organization } = useOrganization()
  const familyId = organization?.id
  const [chores, setChores] = useState<Chore[]>([])
  const [completions, setCompletions] = useState<ChoreCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const weekStart = useMemo(() => startOfWeek(today, LANGUAGES[currentLanguage()].weekStart), [today])
  const from = toDateInput(weekStart)
  const to = toDateInput(addDays(weekStart, 6))

  const reload = useCallback(async () => {
    if (!supabase) {
      setError(i18n.t("errors.supabaseConfig"))
      setLoading(false)
      return
    }
    if (!familyId) {
      setChores([])
      setCompletions([])
      setLoading(false)
      return
    }
    const [choresResult, completionsResult] = await Promise.all([
      supabase.from("chores").select("id, title, stars, weekdays, chore_members(member_id)").order("created_at"),
      supabase.from("chore_completions").select("chore_id, member_id, done_on, stars").gte("done_on", from).lte("done_on", to),
    ])
    if (choresResult.error || completionsResult.error) {
      console.error(choresResult.error ?? completionsResult.error)
      setError(i18n.t("errors.loadChores"))
    } else {
      setChores((choresResult.data as ChoreRow[]).map(({ chore_members, ...chore }) => ({
        ...chore,
        member_ids: chore_members.map((m) => m.member_id),
      })))
      setCompletions(completionsResult.data as ChoreCompletion[])
      setError(null)
    }
    setLoading(false)
  }, [supabase, familyId, from, to])

  useEffect(() => {
    setLoading(true)
    reload()
  }, [reload])

  useLiveRefresh(supabase, familyId, CHORE_TABLES, reload)

  // Ticks update the screen immediately (it's a touch screen) and roll back if the write fails.
  const setDone = useCallback(async (chore: Chore, memberId: string, day: Date, done: boolean) => {
    const entry: ChoreCompletion = { chore_id: chore.id, member_id: memberId, done_on: toDateInput(day), stars: chore.stars }
    const same = (c: ChoreCompletion) => c.chore_id === entry.chore_id && c.member_id === entry.member_id && c.done_on === entry.done_on
    setCompletions((current) => (done ? [...current.filter((c) => !same(c)), entry] : current.filter((c) => !same(c))))
    const { error } = done
        ? await supabase!.from("chore_completions").insert(entry)
        : await supabase!.from("chore_completions").delete()
            .eq("chore_id", entry.chore_id).eq("member_id", entry.member_id).eq("done_on", entry.done_on)
    if (error) {
      console.error(error)
      setCompletions((current) => (done ? current.filter((c) => !same(c)) : [...current, entry]))
      return i18n.t("errors.updateChore")
    }
    return null
  }, [supabase])

  const setMembers = useCallback(async (choreId: string, memberIds: string[]) => {
    const { error: deleteError } = await supabase!.from("chore_members").delete().eq("chore_id", choreId)
    if (deleteError || memberIds.length === 0) {
      return deleteError
    }
    const { error } = await supabase!.from("chore_members").insert(memberIds.map((member_id) => ({ chore_id: choreId, member_id })))
    return error
  }, [supabase])

  // Creates the chore, then who does it; removes the chore again if that fails. Returns an error message or null.
  const add = useCallback(async (input: ChoreInput) => {
    const { data, error } = await supabase!.from("chores")
        .insert({ title: input.title, stars: input.stars, weekdays: input.weekdays }).select("id").single()
    if (error) {
      console.error(error)
      return i18n.t("errors.saveChore")
    }
    const membersError = await setMembers(data.id, input.member_ids)
    if (membersError) {
      console.error(membersError)
      await supabase!.from("chores").delete().eq("id", data.id)
      return i18n.t("errors.saveChore")
    }
    await reload()
    return null
  }, [supabase, setMembers, reload])

  // Updates a chore and who does it. Members who are no longer assigned lose their ticks for it.
  const update = useCallback(async (id: string, input: ChoreInput) => {
    const { data, error } = await supabase!.from("chores")
        .update({ title: input.title, stars: input.stars, weekdays: input.weekdays }).eq("id", id).select("id")
    if (error || !data?.length) {
      console.error(error ?? "No rows changed")
      return i18n.t("errors.saveChore")
    }
    const current = chores.find((c) => c.id === id)?.member_ids ?? []
    const unchanged = current.length === input.member_ids.length && current.every((m) => input.member_ids.includes(m))
    const membersError = unchanged ? null : await setMembers(id, input.member_ids)
    await reload()
    if (membersError) {
      console.error(membersError)
      return i18n.t("errors.saveChore")
    }
    return null
  }, [supabase, chores, setMembers, reload])

  const remove = useCallback(async (id: string) => {
    const { data, error } = await supabase!.from("chores").delete().eq("id", id).select("id")
    if (error || !data?.length) {
      console.error(error ?? "No rows changed")
      return i18n.t("errors.deleteChore")
    }
    await reload()
    return null
  }, [supabase, reload])

  return { chores, completions, weekStart, loading, error, setDone, add, update, remove }
}
