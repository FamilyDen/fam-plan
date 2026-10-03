import { useTranslation } from "react-i18next";
import MemberAvatar from "./MemberAvatar.tsx";
import { isDone, starsFor, type Chore, type ChoreCompletion } from "../lib/chores.ts";
import type { FamilyMember } from "../lib/familyMembers.ts";

type ChoreColumnProps = {
  member: FamilyMember
  chores: Chore[] // the member's chores today
  completions: ChoreCompletion[] // this week's
  today: Date
  justDone: string | null // "<choreId>:<memberId>" that was just ticked, for the star animation
  onTick: (chore: Chore, done: boolean) => void
}

// One person's column on the chores card: today's chores as big tap targets, how many are done, this
// week's stars and progress towards their weekly goal, and a celebration when everything is done.
function ChoreColumn({ member, chores, completions, today, justDone, onTick }: ChoreColumnProps) {
  const { t } = useTranslation()
  const doneCount = chores.filter((c) => isDone(completions, c.id, member.id, today)).length
  const allDone = chores.length > 0 && doneCount === chores.length
  const stars = starsFor(completions, member.id)
  const goal = member.weekly_star_goal

  return (
      <div className="chore-column">
          <div className="chore-column-head">
              <MemberAvatar member={member} size={36} />
              <div className="chore-column-name">
                  <span>{member.name}</span>
                  <span className={`muted${allDone ? " all-done" : ""}`}>
                      {chores.length === 0 ? t("chores.noneToday")
                          : allDone ? t("chores.allDone")
                          : t("chores.progress", { done: doneCount, count: chores.length })}
                  </span>
              </div>
              <span className="chore-star-total" aria-label={t("chores.starsThisWeek", { count: stars })}>★ {stars}</span>
          </div>

          {goal && (
              <div className="chore-goal">
                  <div className="chore-goal-bar"><span style={{ width: `${Math.min(100, (stars / goal) * 100)}%` }} /></div>
                  <div className="chore-goal-text">
                      <span>{stars >= goal ? t("chores.goalReached") : t("chores.goalProgress", { stars, goal })}</span>
                      {member.weekly_reward && <span>🎁 {member.weekly_reward}</span>}
                  </div>
              </div>
          )}

          {allDone ? (
              <div className="chore-celebrate"><span aria-hidden>🎉</span>{t("chores.greatJob")}</div>
          ) : (
              <ul className="chore-list">
                  {chores.map((chore) => {
                    const done = isDone(completions, chore.id, member.id, today)
                    const key = `${chore.id}:${member.id}`
                    return (
                        <li key={chore.id}>
                            <button
                                className={`chore-item${done ? " done" : ""}${justDone === key ? " just-done" : ""}`}
                                role="checkbox"
                                aria-checked={done}
                                onClick={() => onTick(chore, !done)}
                            >
                                <span className="chore-check" aria-hidden>{done ? "✓" : ""}</span>
                                <span className="chore-title">{chore.title}</span>
                                <span className="chore-earn">+{chore.stars} ★</span>
                            </button>
                        </li>
                    )
                  })}
              </ul>
          )}
      </div>
  )
}

export default ChoreColumn
