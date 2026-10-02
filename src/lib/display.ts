import { useEffect, useState } from "react";

// Family screen behaviour: a ticking clock, keeping the screen awake, and night dimming.

// Whether `date` falls in the night-mode window "HH:MM"–"HH:MM" (local time). The window may cross
// midnight (22:00–06:00); equal start and end means no night at all.
export function isNight(date: Date, start: string, end: string) {
  const minutes = (time: string) => {
    const [h, m] = time.split(":").map(Number)
    return h * 60 + m
  }
  const now = date.getHours() * 60 + date.getMinutes()
  const from = minutes(start)
  const to = minutes(end)
  if (from === to) {
    return false
  }
  return from < to ? now >= from && now < to : now >= from || now < to
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
