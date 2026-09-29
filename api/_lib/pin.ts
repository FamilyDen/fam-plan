import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Parent kiosk PINs live in the parent's Clerk privateMetadata (server-only) as a salted scrypt hash,
// together with the wrong-attempt counter used for lockouts.
export type KioskPin = {
  hash: string
  salt: string
  failures: number
  lockedUntil: number | null
  disabled: boolean
}

export const PIN_PATTERN = /^\d{4,8}$/

// Every 5 wrong attempts lock the PIN for 5 minutes; 10 in a row disable it
// until the parent signs in with their password and sets a new PIN.
export const FAILURES_PER_LOCK = 5
export const LOCK_MS = 5 * 60 * 1000
export const MAX_FAILURES = 10

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>
const KEY_LENGTH = 32

export async function hashPin(pin: string): Promise<KioskPin> {
  const salt = randomBytes(16)
  const hash = await scryptAsync(pin, salt, KEY_LENGTH)
  return { hash: hash.toString("base64"), salt: salt.toString("base64"), failures: 0, lockedUntil: null, disabled: false }
}

export async function pinMatches(pin: string, stored: KioskPin) {
  const actual = await scryptAsync(pin, Buffer.from(stored.salt, "base64"), KEY_LENGTH)
  const expected = Buffer.from(stored.hash, "base64")
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function readKioskPin(privateMetadata: Record<string, unknown> | undefined): KioskPin | null {
  const pin = privateMetadata?.kioskPin as KioskPin | undefined
  return pin?.hash && pin?.salt ? pin : null
}

// State after one more wrong attempt.
export function withFailure(pin: KioskPin, now: number): KioskPin {
  const failures = pin.failures + 1
  return {
    ...pin,
    failures,
    disabled: failures >= MAX_FAILURES,
    lockedUntil: failures % FAILURES_PER_LOCK === 0 ? now + LOCK_MS : pin.lockedUntil,
  }
}
