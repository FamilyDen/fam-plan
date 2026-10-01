import { useEffect, useState } from "react";

// Wall-screen behaviour for the kiosk: a ticking clock, keeping the screen awake, and night dimming.

// Night mode hours on the kiosk (local time): dim from NIGHT_START until NIGHT_END.
export const NIGHT_START_HOUR = 22
export const NIGHT_END_HOUR = 6

export function isNight(date: Date) {
  const hour = date.getHours()
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR
}

// The current time, updated at the start of every minute.
export function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const current = new Date()
      setNow(current)
      timer = setTimeout(tick, 60_000 - (current.getSeconds() * 1000 + current.getMilliseconds()))
    }
    tick()
    return () => clearTimeout(timer)
  }, [])
  return now
}

// Keeps the screen from sleeping while enabled, using the Screen Wake Lock API where the browser has it.
// Browsers drop the lock when the page is hidden, so it is requested again whenever the page is visible.
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !("wakeLock" in navigator)) {
      return
    }
    let lock: WakeLockSentinel | null = null
    let released = false

    const request = async () => {
      if (document.visibilityState !== "visible" || (lock && !lock.released)) {
        return
      }
      try {
        lock = await navigator.wakeLock.request("screen")
        if (released) {
          await lock.release()
        }
      } catch (error) {
        // Denied (e.g. battery saver); the screen just follows the device's own sleep setting.
        console.warn("Screen wake lock unavailable", error)
      }
    }

    request()
    document.addEventListener("visibilitychange", request)
    return () => {
      released = true
      document.removeEventListener("visibilitychange", request)
      lock?.release().catch(() => {})
    }
  }, [enabled])
}
