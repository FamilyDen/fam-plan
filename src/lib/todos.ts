import { useCallback, useEffect, useState } from "react";
import { useOrganization } from "@clerk/clerk-react";
import { useLiveRefresh } from "./realtime.ts";
import { useSupabase } from "./supabase.ts";

export type Todo = {
  id: string
  title: string
  done: boolean
  assigned_to: string | null
  created_at: string
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
        .select("id, title, done, assigned_to, created_at")
        .order("created_at")
    if (error) {
      console.error(error)
      setError("Couldn't load to-dos")
    } else {
      setTodos(data as Todo[])
      setError(null)
    }
    setLoading(false)
  }, [supabase, familyId])

  useEffect(() => {
    setLoading(true)
    reload()
  }, [reload])

  // Other screens' changes (e.g. a to-do ticked on a parent's phone) show up here without a reload.
  useLiveRefresh(supabase, familyId, [{ table: "todos", byFamily: true }], reload)

  const add = useCallback(async (title: string, assignedTo: string | null) => {
    const { data, error } = await supabase!
        .from("todos")
        .insert({ title, assigned_to: assignedTo })
        .select("id, title, done, assigned_to, created_at")
        .single()
    if (error) {
      console.error(error)
      return "Couldn't add the to-do"
    }
    setTodos((current) => [...current, data as Todo])
    return null
  }, [supabase])

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
