import { useCallback, useEffect, useState } from "react";
import { useOrganization } from "@clerk/clerk-react";
import { useLiveRefresh } from "./realtime.ts";
import { useSupabase } from "./supabase.ts";

export type FamilyEvent = {
  id: string
  title: string
  starts_at: string
  ends_at: string | null
  all_day: boolean
  member_ids: string[]
}

export type FamilyEventInput = {
  title: string
  startsAt: Date
  endsAt: Date | null
  allDay: boolean
  memberIds: string[]
}

type EventRow = Omit<FamilyEvent, "member_ids"> & { event_members: { member_id: string }[] }

// event_members has no family_id; row-level security limits which of its changes reach this screen.
const EVENT_TABLES = [{ table: "events", byFamily: true }, { table: "event_members", byFamily: false }]

const EVENT_COLUMNS = "id, title, starts_at, ends_at, all_day, event_members(member_id)"

// Events of the active family that start within [from, to), with the members taking part.
// Everyone in the family can see events; only family admins (parents) can change them,
// which row-level security enforces.
export function useEvents(from: Date, to: Date) {
  const supabase = useSupabase()
  const { organization } = useOrganization()
  const familyId = organization?.id
  const [events, setEvents] = useState<FamilyEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fromIso = from.toISOString()
  const toIso = to.toISOString()

  const reload = useCallback(async () => {
    if (!supabase) {
      setError("Supabase isn't configured (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY)")
      setLoading(false)
      return
    }
    if (!familyId) {
      setEvents([])
      setLoading(false)
      return
    }
    const { data, error } = await supabase
        .from("events")
        .select(EVENT_COLUMNS)
        .gte("starts_at", fromIso)
        .lt("starts_at", toIso)
        .order("all_day", { ascending: false }) // all-day events first within a day
        .order("starts_at")
    if (error) {
      console.error(error)
      setError("Couldn't load events")
    } else {
      setEvents((data as EventRow[]).map(({ event_members, ...event }) => ({
        ...event,
        member_ids: event_members.map((m) => m.member_id),
      })))
      setError(null)
    }
    setLoading(false)
  }, [supabase, familyId, fromIso, toIso])

  useEffect(() => {
    setLoading(true)
    reload()
  }, [reload])

  // Other screens' changes (e.g. a to-do ticked on a parent's phone) show up here without a reload.
  useLiveRefresh(supabase, familyId, EVENT_TABLES, reload)

  const setMembers = useCallback(async (eventId: string, memberIds: string[]) => {
    const { error: deleteError } = await supabase!.from("event_members").delete().eq("event_id", eventId)
    if (deleteError) {
      return deleteError
    }
    if (memberIds.length === 0) {
      return null
    }
    const { error } = await supabase!
        .from("event_members")
        .insert(memberIds.map((memberId) => ({ event_id: eventId, member_id: memberId })))
    return error
  }, [supabase])

  // Creates the event, then its members. If the members can't be saved, the event is removed again
  // so there's never a half-saved event. Returns an error message, or null on success.
  const add = useCallback(async (input: FamilyEventInput) => {
    const { data, error } = await supabase!
        .from("events")
        .insert(toRow(input))
        .select("id")
        .single()
    if (error) {
      console.error(error)
      return "Couldn't add the event"
    }
    const membersError = await setMembers(data.id, input.memberIds)
    if (membersError) {
      console.error(membersError)
      await supabase!.from("events").delete().eq("id", data.id)
      return "Couldn't add the event"
    }
    await reload()
    return null
  }, [supabase, setMembers, reload])

  const update = useCallback(async (id: string, input: FamilyEventInput) => {
    const { data, error } = await supabase!.from("events").update(toRow(input)).eq("id", id).select("id")
    if (error || !data?.length) {
      console.error(error ?? "No rows changed")
      return "Couldn't save the event"
    }
    const membersError = await setMembers(id, input.memberIds)
    await reload()
    if (membersError) {
      console.error(membersError)
      return "The event was saved, but not who's taking part"
    }
    return null
  }, [supabase, setMembers, reload])

  const remove = useCallback(async (id: string) => {
    const { data, error } = await supabase!.from("events").delete().eq("id", id).select("id")
    if (error || !data?.length) {
      console.error(error ?? "No rows changed")
      return "Couldn't delete the event"
    }
    await reload()
    return null
  }, [supabase, reload])

  return { events, loading, error, add, update, remove }
}

function toRow(input: FamilyEventInput) {
  return {
    title: input.title,
    starts_at: input.startsAt.toISOString(),
    ends_at: input.endsAt?.toISOString() ?? null,
    all_day: input.allDay,
  }
}
