import { useState } from "react";
import { useTranslation } from "react-i18next";

type PinPadProps = {
  // Called with the entered digits when the parent taps OK.
  onSubmit: (pin: string) => void
  disabled?: boolean
  maxLength?: number
  minLength?: number
}

// Large touch-friendly number pad that shows entered digits as dots.
function PinPad({ onSubmit, disabled = false, maxLength = 8, minLength = 4 }: PinPadProps) {
  const { t } = useTranslation()
  const [pin, setPin] = useState("")

  function press(digit: string) {
    setPin((current) => (current.length < maxLength ? current + digit : current))
  }

  function submit() {
    onSubmit(pin)
    setPin("")
  }

  return (
      <div className="pin-pad">
          <div className="pin-dots" aria-label={t("pin.digitsEntered", { count: pin.length })}>
              {Array.from({ length: Math.max(minLength, pin.length) }, (_, i) => (
                  <span key={i} className={i < pin.length ? "filled" : ""} />
              ))}
          </div>
          <div className="pin-keys">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                  <button key={digit} onClick={() => press(digit)} disabled={disabled}>{digit}</button>
              ))}
              <button onClick={() => setPin((current) => current.slice(0, -1))} disabled={disabled} aria-label={t("common.delete")}>⌫</button>
              <button onClick={() => press("0")} disabled={disabled}>0</button>
              <button className="primary" onClick={submit} disabled={disabled || pin.length < minLength}>{t("common.ok")}</button>
          </div>
      </div>
  )
}

export default PinPad
