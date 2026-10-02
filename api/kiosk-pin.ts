import { clerk, getSession, isFamilyAdmin, json } from "./_lib/clerk.js";
import { hashPin, PIN_PATTERN, readKioskPin } from "./_lib/pin.js";

// GET  /api/kiosk-pin  -> { hasPin, disabled }   status of the signed-in parent's kiosk PIN
// POST /api/kiosk-pin  { pin }                   set or replace it (also clears lockouts)
//
// Only family admins signed in with their own account can manage their PIN; the kiosk account cannot.

export default {
  async fetch(request: Request) {
    const session = await getSession(request)
    if (!session) {
      return json({ error: "Unauthorized" }, 401)
    }
    if (!isFamilyAdmin(session)) {
      return json({ error: "Only family admins have an unlock PIN" }, 403)
    }

    if (request.method === "GET") {
      const user = await clerk.users.getUser(session.userId)
      const pin = readKioskPin(user.privateMetadata)
      return json({ hasPin: pin !== null, disabled: pin?.disabled ?? false })
    }

    if (request.method === "POST") {
      const body = await request.json().catch(() => null) as { pin?: unknown } | null
      const pin = body?.pin
      if (typeof pin !== "string" || !PIN_PATTERN.test(pin)) {
        return json({ error: "PIN must be 4 to 8 digits" }, 400)
      }

      await clerk.users.updateUserMetadata(session.userId, {
        privateMetadata: { kioskPin: await hashPin(pin) },
      })
      return json({ hasPin: true, disabled: false })
    }

    return json({ error: "Method not allowed" }, 405)
  },
}
