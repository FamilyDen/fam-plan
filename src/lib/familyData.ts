import { useCallback } from "react";
import { useClerk, useOrganization, useUser } from "@clerk/clerk-react";
import { toDateInput } from "./dates.ts";
import { useApi } from "./kiosk.ts";
import { useSupabase } from "./supabase.ts";

// GDPR tools for family admins (parents): download all of the family's data, and delete the family.
// The database parts are export_family_data() / delete_family_data() (20261006000000_gdpr.sql); the Clerk part
// of deleting is api/family-delete.ts.

export function useFamilyData() {
  const supabase = useSupabase()
  const api = useApi()
  const clerk = useClerk()
  const { user } = useUser()
  const { organization } = useOrganization()

  // Everything about the family in one JSON file: the family and its parents' accounts (from Clerk),
  // and the members, events, to-dos, chores and settings (from Supabase).
  const download = useCallback(async () => {
    if (!supabase || !organization) {
      return false
    }
    const [{ data, error }, memberships] = await Promise.all([
      supabase.rpc("export_family_data"),
      organization.getMemberships({ pageSize: 100 }),
    ])
    if (error) {
      console.error(error)
      return false
    }
    const file = {
      app: "FamPlan",
      family: { id: organization.id, name: organization.name, created_at: organization.createdAt },
      exported_by: { name: user?.fullName, email: user?.primaryEmailAddress?.emailAddress },
      accounts: memberships.data.map((m) => ({
        name: [m.publicUserData?.firstName, m.publicUserData?.lastName].filter(Boolean).join(" ") || null,
        email: m.publicUserData?.identifier ?? null,
        role: m.role,
        joined_at: m.createdAt,
      })),
      data,
    }
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `famplan-${organization.slug ?? organization.id}-${toDateInput(new Date())}.json`
    link.click()
    URL.revokeObjectURL(url)
    return true
  }, [supabase, organization, user])

  // Permanently deletes the family: its data in Supabase first, then the family screen account and the
  // family itself in Clerk, then switches to another of your families (if any). Returns true when done.
  const deleteFamily = useCallback(async () => {
    if (!supabase) {
      return false
    }
    const { error } = await supabase.rpc("delete_family_data")
    if (error) {
      console.error(error)
      return false
    }
    const deletedId = organization?.id
    const response = await api("/api/family-delete", { method: "POST" })
    if (!response.ok) {
      console.error("Deleting the family in Clerk failed", response.status)
      return false
    }
    // Clerk still has the deleted family cached in this browser: refresh the account, then continue in
    // another family you belong to, or without a family (the dashboard then offers to create one).
    const fresh = await user?.reload()
    const next = fresh?.organizationMemberships.find((m) => m.organization.id !== deletedId)
    await clerk.setActive({ organization: next?.organization.id ?? null })
    return true
  }, [supabase, api, clerk, user, organization])

  return { download, deleteFamily }
}
