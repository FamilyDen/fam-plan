import { useCallback, useEffect, useMemo, useState } from "react";
import { useOrganization } from "@clerk/clerk-react";
import { toDateInput } from "./dates.ts";
import { useLiveRefresh } from "./realtime.ts";
import { occurrencesIn, type Occurrence, type RepeatRule } from "./recurrence.ts";
import { useSupabase } from "./supabase.ts";

// An event as stored: one-off, or a repeating series (starts_at/ends_at describe its first occurrence).
export type FamilyEvent = RepeatRule & {
  id: string
  title: string
  starts_at: string
  ends_at: string | null
  all_day: boolean
  member_ids: string[]
  skip_dates: string[]
}

// One date on which an event happens; repeating events have one per matching day.
export type EventOccurrence = Occurrence & { event: FamilyEvent, key: string }

export type FamilyEventInput = {
  title: string
  startsAt: Date
  endsAt: Date | null
  allDay: boolean
  memberIds: string[]
  rule: RepeatRule
}

type EventRow = Omit<FamilyEvent, "member_ids" | "skip_dates"> & {
  event_members: { member_id: string }[]
  event_skips: { skip_date: string }[]
}

// event_members and event_skips have no family_id; row-level security limits which of their changes reach this screen.
const EVENT_TABLES = [
  { table: "events", byFamily: true },
  { table: "event_members", byFamily: false },
  { table: "event_skips", byFamily: false },
]

const EVENT_COLUMNS = "id, title, starts_at, ends_at, all_day, repeat, repeat_interval, repeat_weekdays, repeat_week, repeat_until, "
    + "event_members(member_id), event_skips(skip_date)"

// The active family's events that happen on local days [from, to): one-off events starting in the window,
// plus repeating series that have started and haven't ended, expanded into their dates.
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
  const fromDate = toDateInput(from)

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
        .or(`and(repeat.is.null,starts_at.gte."${fromIso}",starts_at.lt."${toIso}"),`
            + `and(repeat.not.is.null,starts_at.lt."${toIso}",or(repeat_until.is.null,repeat_until.gte.${fromDate}))`)
    if (error) {
      console.error(error)
      setError("Couldn't load events")
    } else {
      setEvents((data as unknown as EventRow[]).map(({ event_members, event_skips, ...event }) => ({
        ...event,
        member_ids: event_members.map((m) => m.member_id),
        skip_dates: event_skips.map((s) => s.skip_date),
      })))
      setError(null)
    }
    setLoading(false)
  }, [supabase, familyId, fromIso, toIso, fromDate])

  useEffect(() => {
    setLoading(true)
    reload()
  }, [reload])

  // Other screens' changes show up here without a reload.
  useLiveRefresh(supabase, familyId, EVENT_TABLES, reload)

  const occurrences = useMemo(() => {
    const days = Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000)
    return events
        .flatMap((event) => occurrencesIn(event, new Date(fromIso), days, new Set(event.skip_dates))
            .map((o) => ({ ...o, event, key: `${event.id}:${toDateInput(o.startsAt)}` })))
        // Within a day, all-day events first, then by time.
        .sort((a, b) => toDateInput(a.startsAt).localeCompare(toDateInput(b.startsAt))
            || Number(b.event.all_day) - Number(a.event.all_day)
            || a.startsAt.getTime() - b.startsAt.getTime())
  }, [events, fromIso, toIso])

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

  // Updates the event (for a repeating event: the whole series), then its members.
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

  // Deletes the event; for a repeating event, the whole series (its members and skips go with it).
  const remove = useCallback(async (id: string) => {
    const { data, error } = await supabase!.from("events").delete().eq("id", id).select("id")
    if (error || !data?.length) {
      console.error(error ?? "No rows changed")
      return "Couldn't delete the event"
    }
    await reload()
    return null
  }, [supabase, reload])

  // Cancels one date of a repeating event.
  const skip = useCallback(async (id: string, date: string) => {
    const { error } = await supabase!.from("event_skips").insert({ event_id: id, skip_date: date })
    if (error) {
      console.error(error)
      return "Couldn't skip that date"
    }
    await reload()
    return null
  }, [supabase, reload])

  return { occurrences, loading, error, add, update, remove, skip }
}

function toRow(input: FamilyEventInput) {
  const { rule } = input
  return {
    title: input.title,
    starts_at: input.startsAt.toISOString(),
    ends_at: input.endsAt?.toISOString() ?? null,
    all_day: input.allDay,
    repeat: rule.repeat,
    repeat_interval: rule.repeat ? rule.repeat_interval : 1,
    repeat_weekdays: rule.repeat === "weekly" ? rule.repeat_weekdays : null,
    repeat_week: rule.repeat === "monthly_weekday" ? rule.repeat_week : null,
    repeat_until: rule.repeat ? rule.repeat_until : null,
  }
}
