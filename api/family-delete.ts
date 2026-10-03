import { clerk, getSession, isFamilyAdmin, json } from "./_lib/clerk.js";

// POST /api/family-delete
//
// The Clerk half of "Delete family": removes the family's family-screen (kiosk) account and the family
// (organization) itself, which ends everyone's membership. Only an admin (parent) of the active family may
// call it. The app first deletes the family's data in Supabase (delete_family_data()), then calls this.

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405)
    }

    const session = await getSession(request)
    if (!session) {
      return json({ error: "Unauthorized" }, 401)
    }
    if (!isFamilyAdmin(session)) {
      return json({ error: "Only family admins can delete the family" }, 403)
    }
    const familyId = session.orgId

    try {
      const { data: screens } = await clerk.users.getUserList({ externalId: [`kiosk_${familyId}`], limit: 1 })
      for (const screen of screens) {
        await clerk.users.deleteUser(screen.id)
      }
      await clerk.organizations.deleteOrganization(familyId)
      return json({ deleted: true })
    } catch (error) {
      console.error("Failed to delete family", familyId, error)
      return json({ error: "Could not delete the family" }, 500)
    }
  },
}
