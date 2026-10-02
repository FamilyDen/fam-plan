import { useEffect, useState } from "react";
import { isNight } from "../lib/display.ts";
import type { FamilySettings } from "../lib/familySettings.ts";

const WAKE_MS = 2 * 60 * 1000

// During the family's night hours the family screen dims to a quiet clock. A tap wakes it for a couple of minutes.
function NightScreen({ now, settings }: { now: Date, settings: FamilySettings }) {
  const [awakeUntil, setAwakeUntil] = useState(0)
  const [, rerender] = useState(0)

  // Re-check when the wake period ends, without waiting for the next minute tick.
  useEffect(() => {
    const remaining = awakeUntil - Date.now()
    if (remaining <= 0) {
      return
    }
    const timer = setTimeout(() => rerender((n) => n + 1), remaining)
    return () => clearTimeout(timer)
  }, [awakeUntil])

  if (!settings.nightMode || !isNight(now, settings.nightStart, settings.nightEnd) || Date.now() < awakeUntil) {
    return null
  }

  return (
      <button className="night-screen" onClick={() => setAwakeUntil(Date.now() + WAKE_MS)} aria-label="Wake the screen">
          <span className="night-time">
              {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}
          </span>
          <span className="night-hint">Tap to wake</span>
      </button>
  )
}

export default NightScreen
