import type { FamilyMember } from "../lib/familyMembers.ts";

// Round badge with the member's first initial in their color.
function MemberAvatar({ member, size = 40 }: { member: Pick<FamilyMember, "name" | "color">, size?: number }) {
  return (
      <span
          className="member-avatar"
          style={{ width: size, height: size, fontSize: size * 0.45, backgroundColor: member.color ?? "#6b7280" }}
          aria-hidden
      >
          {member.name.trim().charAt(0).toUpperCase()}
      </span>
  )
}

export default MemberAvatar
