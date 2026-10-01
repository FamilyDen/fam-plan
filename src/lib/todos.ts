import { useCallback, useEffect, useState } from "react";
import { useOrganization } from "@clerk/clerk-react";
import { useLiveRefresh } from "./realtime.ts";
import { useSupabase } from "./supabase.ts";

export type Todo = {
  id: string
  title: string
  done: boolean
  member_ids: string[] // who it's for (todo_members); empty = everyone / unassigned
  created_at: string
}

type TodoRow = Omit<Todo, "member_ids"> & { todo_members: { member_id: string }[] }

const TODO_COLUMNS = "id, title, done, created_at, todo_members(member_id)"

// todo_members has no family_id; row-level security limits which of its changes reach this screen.
const TODO_TABLES = [{ table: "todos", byFamily: true }, { table: "todo_members", byFamily: false }]

function fromRow({ todo_members, ...todo }: TodoRow): Todo {
  return { ...todo, member_ids: todo_members.map((m) => m.member_id) }
}

// To-dos of the active family. Row-level security scopes every query to the active Clerk organization;
// everyone in the family, including the kiosk, can add, tick off and clear to-dos.
export function useTodos() {
  const supabase = useSupabase()
  const { organization } = useOrganization()
  const familyId = organization?.id
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!supabase) {
      setError("Supabase isn't configured (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY)")
      setLoading(false)
      return
    }
    if (!familyId) {
      setTodos([])
      setLoading(false)
      return
    }
    const { data, error } = await supabase
        .from("todos")
        .select(TODO_COLUMNS)
        .order("created_at")
    if (error) {
      console.error(error)
      setError("Couldn't load to-dos")
    } else {
      setTodos((data as TodoRow[]).map(fromRow))
      setError(null)
    }
    setLoading(false)
  }, [supabase, familyId])

  useEffect(() => {
    setLoading(true)
    reload()
  }, [reload])

  // Other screens' changes (e.g. a to-do ticked on a parent's phone) show up here without a reload.
  useLiveRefresh(supabase, familyId, TODO_TABLES, reload)

  // Creates the to-do, then who it's for. If those links can't be saved, the to-do is removed again
  // so there's never a half-saved to-do. Returns an error message, or null on success.
  const add = useCallback(async (title: string, memberIds: string[]) => {
    const { data, error } = await supabase!
        .from("todos")
        .insert({ title })
        .select("id")
        .single()
    if (error) {
      console.error(error)
      return "Couldn't add the to-do"
    }
    if (memberIds.length > 0) {
      const { error: membersError } = await supabase!
          .from("todo_members")
          .insert(memberIds.map((memberId) => ({ todo_id: data.id, member_id: memberId })))
      if (membersError) {
        console.error(membersError)
        await supabase!.from("todos").delete().eq("id", data.id)
        return "Couldn't add the to-do"
      }
    }
    await reload()
    return null
  }, [supabase, reload])

  // Ticks update the screen immediately (it's a touch screen) and roll back if the write fails.
  const setDone = useCallback(async (id: string, done: boolean) => {
    setTodos((current) => current.map((t) => (t.id === id ? { ...t, done } : t)))
    const { data, error } = await supabase!.from("todos").update({ done }).eq("id", id).select("id")
    if (error || !data?.length) {
      console.error(error ?? "No rows changed")
      setTodos((current) => current.map((t) => (t.id === id ? { ...t, done: !done } : t)))
      return "Couldn't update the to-do"
    }
    return null
  }, [supabase])

  // Deletes the done to-dos, or only those among `ids` (e.g. the ones visible under a filter).
  const clearDone = useCallback(async (ids?: string[]) => {
    const doneIds = todos.filter((t) => t.done && (!ids || ids.includes(t.id))).map((t) => t.id)
    if (doneIds.length === 0) {
      return null
    }
    const { error } = await supabase!.from("todos").delete().in("id", doneIds)
    if (error) {
      console.error(error)
      return "Couldn't clear done to-dos"
    }
    await reload()
    return null
  }, [supabase, todos, reload])

  return { todos, loading, error, add, setDone, clearDone }
}
