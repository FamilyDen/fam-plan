// Small outline icons for form field labels (24×24 viewBox, drawn with the current text color).
const PATHS = {
  calendar: "M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM16 3v4M8 3v4M4 11h16",
  calendarPlus: "M12.5 21H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5M16 3v4M8 3v4M4 11h16M16 19h6M19 16v6",
  clock: "M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0M12 7v5l3 3",
  repeat: "M4 12V9a3 3 0 0 1 3-3h13m-3-3 3 3-3 3M20 12v3a3 3 0 0 1-3 3H4m3 3-3-3 3-3",
  users: "M5 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.85",
  x: "M18 6 6 18M6 6l12 12",
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
