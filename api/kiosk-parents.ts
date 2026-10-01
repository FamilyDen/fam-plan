import { clerk, getSession, isFamilyKiosk, json } from "./_lib/clerk.js";
import { readKioskPin } from "./_lib/pin.js";

// GET /api/kiosk-parents -> { parents: [{ userId, name, imageUrl, hasPin }] }
//
// The family's admins, for the kiosk's "who is unlocking?" screen. Only the family's kiosk account may ask.

export default {
  async fetch(request: Request) {
    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, 405)
    }

    const session = await getSession(request)
    if (!session) {
      return json({ error: "Unauthorized" }, 401)
    }
    if (!session.orgId || !(await isFamilyKiosk(session))) {
      return json({ error: "Only the family screen can list parents" }, 403)
    }

    const { data: memberships } = await clerk.organizations.getOrganizationMembershipList({
      organizationId: session.orgId,
      limit: 100,
    })
    const adminIds = memberships
        .filter((m) => m.role === "org:admin" && m.publicUserData?.userId)
        .map((m) => m.publicUserData!.userId)

    if (adminIds.length === 0) {
      return json({ parents: [] })
    }

    const { data: users } = await clerk.users.getUserList({ userId: adminIds, limit: 100 })
    const parents = users.map((user) => {
      const pin = readKioskPin(user.privateMetadata)
      return {
        userId: user.id,
        name: user.firstName ?? user.username ?? "Parent",
        imageUrl: user.imageUrl,
        hasPin: pin !== null && !pin.disabled,
      }
    })

    return json({ parents })
  },
}
