import { createClerkClient } from "@clerk/backend";

// POST /api/kiosk-session
//
// Called by a signed-in family admin (a parent) to put the shared touch screen into kiosk mode.
// Finds or creates the family's kiosk Clerk user, makes sure it is a plain member of the family
// organization (never an admin), and returns a short-lived, single-use sign-in token for it.
//
// Env: CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY, KIOSK_EMAIL_DOMAIN (a domain you own, e.g. wefamplan.com)

const SIGN_IN_TOKEN_TTL_SECONDS = 60

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
})

async function findOrCreateKioskUser(familyId: string, familyName: string) {
  const externalId = `kiosk_${familyId}`
  const { data: existing } = await clerk.users.getUserList({ externalId: [externalId], limit: 1 })
  if (existing[0]) {
    return existing[0]
  }

  const domain = process.env.KIOSK_EMAIL_DOMAIN
  if (!domain) {
    throw new Error("KIOSK_EMAIL_DOMAIN is not set")
  }

  return clerk.users.createUser({
    externalId,
    // Kiosk accounts never receive mail; the address only satisfies Clerk's identifier requirement.
    emailAddress: [`kiosk+${familyId.toLowerCase()}@${domain}`],
    firstName: "Kiosk",
    lastName: familyName,
    skipPasswordRequirement: true,
    publicMetadata: { kiosk: true, familyId },
  })
}

async function ensureMemberRole(familyId: string, userId: string) {
  const { data: memberships } = await clerk.users.getOrganizationMembershipList({ userId, limit: 100 })
  const membership = memberships.find((m) => m.organization.id === familyId)

  if (!membership) {
    await clerk.organizations.createOrganizationMembership({ organizationId: familyId, userId, role: "org:member" })
  } else if (membership.role !== "org:member") {
    await clerk.organizations.updateOrganizationMembership({ organizationId: familyId, userId, role: "org:member" })
  }
}

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 })
    }

    const requestState = await clerk.authenticateRequest(request, {
      authorizedParties: [new URL(request.url).origin],
    })
    const auth = requestState.toAuth()

    if (!requestState.isAuthenticated || !auth?.userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!auth.orgId || auth.orgRole !== "org:admin") {
      return Response.json({ error: "Only family admins can start kiosk mode" }, { status: 403 })
    }

    try {
      const family = await clerk.organizations.getOrganization({ organizationId: auth.orgId })
      const kioskUser = await findOrCreateKioskUser(family.id, family.name)
      await ensureMemberRole(family.id, kioskUser.id)

      const { token } = await clerk.signInTokens.createSignInToken({
        userId: kioskUser.id,
        expiresInSeconds: SIGN_IN_TOKEN_TTL_SECONDS,
      })

      return Response.json({ ticket: token, familyId: family.id })
    } catch (error) {
      console.error("Failed to create kiosk session", error)
      return Response.json({ error: "Could not start kiosk mode" }, { status: 500 })
    }
  },
}
