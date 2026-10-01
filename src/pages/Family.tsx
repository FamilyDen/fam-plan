import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useOrganization } from "@clerk/clerk-react";
import MemberAvatar from "../components/MemberAvatar.tsx";
import MemberForm from "../components/MemberForm.tsx";
import { useFamilyMembers } from "../lib/familyMembers.ts";
import { useIsFamilyAdmin } from "../lib/kiosk.ts";

// Everyone in the family, kids included. Family admins (parents) can add, edit and remove members;
// everyone else, including the kiosk, sees the list only.
function Family() {
  const { isLoaded, organization } = useOrganization()
  const isFamilyAdmin = useIsFamilyAdmin()
  const { members, loading, error, add, update, remove } = useFamilyMembers()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)

  if (!isLoaded) {
    return null
  }
  if (!organization) {
    return <Navigate to="/dashboard" replace />
  }

  async function confirmRemove(id: string, name: string) {
    if (!window.confirm(`Remove ${name} from the family? Their to-dos will become unassigned.`)) {
      return
    }
    setRemoveError(await remove(id))
  }

  return (
      <div className="family">
          <h1>{organization.name}</h1>
          <p className="muted">Everyone in the family. Kids don't need their own login.</p>

          {error && <p className="error">{error}</p>}
          {loading && !error && <p className="muted">Loading…</p>}

          {!loading && !error && (
              <ul className="family-list">
                  {members.length === 0 && (
                      <li className="muted">No family members yet.{isFamilyAdmin && " Add the first one below."}</li>
                  )}
                  {members.map((member) => (
                      <li key={member.id}>
                          {editingId === member.id ? (
                              <MemberForm
                                  initial={member}
                                  submitLabel="Save"
                                  onSubmit={async (input) => {
                                    const failure = await update(member.id, input)
                                    if (!failure) {
                                      setEditingId(null)
                                    }
                                    return failure
                                  }}
                                  onCancel={() => setEditingId(null)}
                              />
                          ) : (
                              <>
                                  <MemberAvatar member={member} size={48} />
                                  <span className="family-name">{member.name}</span>
                                  <span className="muted">{member.role === "parent" ? "Parent" : "Child"}</span>
                                  {isFamilyAdmin && (
                                      <span className="family-actions">
                                          <button onClick={() => setEditingId(member.id)}>Edit</button>
                                          <button onClick={() => confirmRemove(member.id, member.name)}>Remove</button>
                                      </span>
                                  )}
                              </>
                          )}
                      </li>
                  ))}
              </ul>
          )}
          {removeError && <p className="error">{removeError}</p>}

          {isFamilyAdmin && !error && (
              <section className="card">
                  <h2>Add a family member</h2>
                  <MemberForm submitLabel="Add" onSubmit={add} />
              </section>
          )}
      </div>
  )
}

export default Family
