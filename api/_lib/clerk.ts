import { createClerkClient } from "@clerk/backend";

// Env: CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY
export const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
})

export const SIGN_IN_TOKEN_TTL_SECONDS = 60

// The signed-in Clerk session behind a request, or null. Requests must come from this app's own origin.
export async function getSession(request: Request) {
  const requestState = await clerk.authenticateRequest(request, {
    authorizedParties: [new URL(request.url).origin],
  })
  const auth = requestState.toAuth()

  if (!requestState.isAuthenticated || !auth?.userId) {
    return null
  }
  return { userId: auth.userId, orgId: auth.orgId ?? null, orgRole: auth.orgRole ?? null }
}

export type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>

export function isFamilyAdmin(session: Session): session is Session & { orgId: string } {
  return session.orgId !== null && session.orgRole === "org:admin"
}

// True when the session is the kiosk account of its active family.
export async function isFamilyKiosk(session: Session) {
  if (!session.orgId) {
    return false
  }
  const user = await clerk.users.getUser(session.userId)
  return user.publicMetadata?.kiosk === true && user.publicMetadata?.familyId === session.orgId
}

export async function isAdminOfFamily(userId: string, familyId: string) {
  const { data: memberships } = await clerk.users.getOrganizationMembershipList({ userId, limit: 100 })
  return memberships.some((m) => m.organization.id === familyId && m.role === "org:admin")
}

export function json(body: unknown, status = 200) {
  return Response.json(body, { status })
}
