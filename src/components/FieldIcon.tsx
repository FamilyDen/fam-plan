// Small outline icons for labels and navigation (24×24 viewBox, drawn with the current text color).
const PATHS = {
  calendar: "M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM16 3v4M8 3v4M4 11h16",
  calendarPlus: "M12.5 21H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5M16 3v4M8 3v4M4 11h16M16 19h6M19 16v6",
  clock: "M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0M12 7v5l3 3",
  repeat: "M4 12V9a3 3 0 0 1 3-3h13m-3-3 3 3-3 3M20 12v3a3 3 0 0 1-3 3H4m3 3-3-3 3-3",
  users: "M5 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.85",
  x: "M18 6 6 18M6 6l12 12",
  settings: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37c1 .608 2.296.07 2.572-1.065zM9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0",
  userPlus: "M8 7a4 4 0 1 0 8 0a4 4 0 0 0-8 0M16 19h6M19 16v6M6 21v-2a4 4 0 0 1 4-4h4",
  plus: "M12 5v14M5 12h14",
  check: "M5 12l5 5L20 7",
  home: "M5 12H3l9-9 9 9h-2M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6",
  lock: "M5 13a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM11 16a1 1 0 1 0 2 0a1 1 0 0 0-2 0M8 11V7a4 4 0 1 1 8 0v4",
  moon: "M12 3h.393a7.5 7.5 0 0 0 7.92 12.446A9 9 0 1 1 12 3z",
  tablet: "M5 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zM11 17a1 1 0 1 0 2 0a1 1 0 0 0-2 0",
  trash: "M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3",
}

export type IconName = keyof typeof PATHS

function FieldIcon({ name, size = 18 }: { name: IconName, size?: number }) {
  return (
      <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
      >
          <path d={PATHS[name]} />
      </svg>
  )
}

export default FieldIcon
