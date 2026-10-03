import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useOrganization } from "@clerk/clerk-react";
import MemberAvatar from "../components/MemberAvatar.tsx";
import MemberEditor from "../components/MemberEditor.tsx";
import { MEMBER_COLORS, useFamilyMembers, type FamilyMember, type FamilyRole } from "../lib/familyMembers.ts";
import { useIsFamilyAdmin } from "../lib/kiosk.ts";
import { useTranslation } from "react-i18next";

// Which card is expanded: a member's id, or a new member of a role ("new:parent" / "new:child").
type Expanded = string | `new:${FamilyRole}` | null

const GROUPS: FamilyRole[] = ["parent", "child"]

// Everyone in the family, kids included, as tiles grouped into parents and children.
// Family admins (parents) tap a tile to expand it in place and edit or remove that member, or tap
// "Add parent" / "Add child"; everyone else, including the kiosk, sees the tiles read-only.
function Family() {
  const { t } = useTranslation()
  const { isLoaded, organization } = useOrganization()
  const isFamilyAdmin = useIsFamilyAdmin()
  const { members, loading, error, add, update, remove } = useFamilyMembers()
  const [expanded, setExpanded] = useState<Expanded>(null)

  if (!isLoaded) {
    return null
  }
  if (!organization) {
    return <Navigate to="/dashboard" replace />
  }

  function tile(member: FamilyMember) {
    if (expanded === member.id) {
      return (
          <MemberEditor
              key={member.id}
              initial={member}
              isNew={false}
              onSave={(input) => update(member.id, input)}
              onRemove={() => remove(member.id)}
              onClose={() => setExpanded(null)}
          />
      )
    }
    const content = (
        <>
            <MemberAvatar member={member} size={56} />
            <span className="member-tile-name">{member.name}</span>
        </>
    )
    return isFamilyAdmin ? (
        <button key={member.id} className="member-tile" onClick={() => setExpanded(member.id)} aria-label={t("members.edit", { name: member.name })}>
            <span className="member-tile-edit" aria-hidden>✎</span>
            {content}
        </button>
    ) : (
        <div key={member.id} className="member-tile">{content}</div>
    )
  }

  return (
      <div className="family">
          <header className="family-header">
              <h1>{t("members.title")}</h1>
              <p className="muted">
                  {organization.name}
                  {!loading && !error && ` · ${t("members.count", { count: members.length })}`}
              </p>
          </header>

          {error && <p className="error">{error}</p>}
          {loading && !error && <p className="muted">{t("common.loading")}</p>}

          {!loading && !error && GROUPS.map((role) => {
            const group = members.filter((m) => m.role === role)
            if (group.length === 0 && !isFamilyAdmin) {
              return null
            }
            return (
                <section key={role} className="family-group">
                    <h2>{t(`members.groups.${role}`)}</h2>
                    <div className="member-grid">
                        {group.map(tile)}
                        {isFamilyAdmin && (expanded === `new:${role}` ? (
                            <MemberEditor
                                // Start with a color nobody in the family uses yet.
                                initial={{ name: "", role, color: MEMBER_COLORS.find((c) => !members.some((m) => m.color === c)) ?? MEMBER_COLORS[0], weekly_star_goal: null, weekly_reward: null }}
                                isNew
                                onSave={add}
                                onClose={() => setExpanded(null)}
                            />
                        ) : (
                            <button className="member-tile member-tile-add" onClick={() => setExpanded(`new:${role}`)}>
                                <span className="member-tile-plus" aria-hidden>+</span>
                                <span className="member-tile-name">{t(`members.add.${role}`)}</span>
                            </button>
                        ))}
                    </div>
                </section>
            )
          })}
      </div>
  )
}

export default Family
