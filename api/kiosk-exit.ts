import { clerk, getSession, isAdminOfFamily, isFamilyKiosk, json, SIGN_IN_TOKEN_TTL_SECONDS } from "./_lib/clerk.js";
import { MAX_FAILURES, pinMatches, readKioskPin, withFailure } from "./_lib/pin.js";

// POST /api/kiosk-exit { userId, pin } -> { ticket, familyId }
//
// Unlocks the kiosk for a parent. Only the family's kiosk account may call this, only for admins of
// that same family, and only with the parent's correct PIN. Wrong PINs count toward lockouts
// (see _lib/pin.ts). On success, returns a short-lived, single-use sign-in token for the parent.

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405)
    }

    const session = await getSession(request)
    if (!session) {
      return json({ error: "Unauthorized" }, 401)
    }
    if (!session.orgId || !(await isFamilyKiosk(session))) {
      return json({ error: "Only the family screen can unlock" }, 403)
    }
    const familyId = session.orgId

    const body = await request.json().catch(() => null) as { userId?: unknown, pin?: unknown } | null
    const userId = body?.userId
    const pin = body?.pin
    if (typeof userId !== "string" || typeof pin !== "string") {
      return json({ error: "userId and pin are required" }, 400)
    }

    if (!(await isAdminOfFamily(userId, familyId))) {
      return json({ error: "Not a parent in this family" }, 403)
    }

    const parent = await clerk.users.getUser(userId)
    const stored = readKioskPin(parent.privateMetadata)
    if (!stored) {
      return json({ error: "no_pin" }, 409)
    }
    if (stored.disabled) {
      return json({ error: "disabled" }, 423)
    }
    const now = Date.now()
    if (stored.lockedUntil && stored.lockedUntil > now) {
      return json({ error: "locked", lockedUntil: stored.lockedUntil }, 423)
    }

    if (!(await pinMatches(pin, stored))) {
      const next = withFailure(stored, now)
      await clerk.users.updateUserMetadata(userId, { privateMetadata: { kioskPin: next } })
      if (next.disabled) {
        return json({ error: "disabled" }, 423)
      }
      if (next.lockedUntil && next.lockedUntil > now) {
        return json({ error: "locked", lockedUntil: next.lockedUntil }, 423)
      }
      return json({ error: "wrong_pin", attemptsLeft: MAX_FAILURES - next.failures }, 401)
    }

    await clerk.users.updateUserMetadata(userId, {
      privateMetadata: { kioskPin: { ...stored, failures: 0, lockedUntil: null } },
    })
    const { token } = await clerk.signInTokens.createSignInToken({
      userId,
      expiresInSeconds: SIGN_IN_TOKEN_TTL_SECONDS,
    })

    return json({ ticket: token, familyId })
  },
}
