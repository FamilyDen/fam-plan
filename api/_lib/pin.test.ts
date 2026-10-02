import { describe, expect, it } from "vitest";
import { hashPin, LOCK_MS, MAX_FAILURES, PIN_PATTERN, pinMatches, readKioskPin, withFailure } from "./pin.js";

describe("unlock PIN hashing", () => {
  it("accepts the right PIN and rejects others", async () => {
    const stored = await hashPin("4821")
    expect(await pinMatches("4821", stored)).toBe(true)
    expect(await pinMatches("4822", stored)).toBe(false)
  })

  it("salts every hash, so the same PIN never gives the same hash", async () => {
    const a = await hashPin("4821")
    const b = await hashPin("4821")
    expect(a.hash).not.toBe(b.hash)
  })

  it("only allows 4 to 8 digits", () => {
    expect(PIN_PATTERN.test("1234")).toBe(true)
    expect(PIN_PATTERN.test("12345678")).toBe(true)
    expect(PIN_PATTERN.test("123")).toBe(false)
    expect(PIN_PATTERN.test("123456789")).toBe(false)
    expect(PIN_PATTERN.test("12a4")).toBe(false)
  })

  it("reads a stored PIN from private metadata", async () => {
    expect(readKioskPin({})).toBeNull()
    expect(readKioskPin(undefined)).toBeNull()
    expect(readKioskPin({ kioskPin: await hashPin("1234") })).not.toBeNull()
  })
})

describe("wrong-PIN lockout", () => {
  it("locks after 5 wrong attempts and disables the PIN after 10", async () => {
    const now = 1_000_000
    let pin = await hashPin("4821")
    for (let attempt = 1; attempt <= MAX_FAILURES; attempt++) {
      pin = withFailure(pin, now)
      const locked = pin.lockedUntil !== null && pin.lockedUntil > now
      if (attempt < 5) {
        expect(locked).toBe(false)
      }
      if (attempt === 5) {
        expect(pin.lockedUntil).toBe(now + LOCK_MS)
        expect(pin.disabled).toBe(false)
      }
      if (attempt < MAX_FAILURES) {
        expect(pin.disabled).toBe(false)
      }
    }
    expect(pin.disabled).toBe(true)
  })
})
