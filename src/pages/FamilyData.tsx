import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useOrganization } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import FieldIcon from "../components/FieldIcon.tsx";
import { useFamilyData } from "../lib/familyData.ts";
import { useIsFamilyAdmin } from "../lib/kiosk.ts";

// For family admins (parents): download all of the family's data, see how old data is cleaned up, and
// permanently delete the family (typing its name to confirm).
function FamilyData() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isFamilyAdmin = useIsFamilyAdmin()
  const { organization } = useOrganization()
  const { download, deleteFamily } = useFamilyData()
  const [downloading, setDownloading] = useState(false)
  const [downloadFailed, setDownloadFailed] = useState(false)
  const [confirmName, setConfirmName] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [deleteFailed, setDeleteFailed] = useState(false)

  if (!isFamilyAdmin || !organization) {
    return <Navigate to="/dashboard" replace />
  }

  const nameMatches = confirmName.trim() === organization.name.trim()

  async function onDownload() {
    setDownloading(true)
    setDownloadFailed(!(await download()))
    setDownloading(false)
  }

  async function onDelete() {
    if (!nameMatches) {
      return
    }
    setDeleting(true)
    setDeleteFailed(false)
    if (await deleteFamily()) {
      navigate("/dashboard", { replace: true })
    } else {
      setDeleteFailed(true)
      setDeleting(false)
    }
  }

  return (
      <div className="family-data-page">
          <header className="page-header">
              <h1>{t("familyData.title")}</h1>
              <p className="muted">{t("familyData.subtitle", { family: organization.name })}</p>
          </header>

          <section className="panel settings-list">
              <div className="settings-row">
                  <div className="settings-row-main">
                      <span className="settings-row-icon"><FieldIcon name="download" /></span>
                      <div className="settings-row-text">
                          <span className="settings-row-title">{t("familyData.download.title")}</span>
                          <span className="muted">{t("familyData.download.text")}</span>
                      </div>
                      <button onClick={onDownload} disabled={downloading}>
                          {downloading ? t("familyData.download.preparing") : t("familyData.download.button")}
                      </button>
                  </div>
                  {downloadFailed && <p className="error settings-row-body">{t("familyData.download.failed")}</p>}
              </div>

              <div className="settings-row">
                  <div className="settings-row-main">
                      <span className="settings-row-icon"><FieldIcon name="clock" /></span>
                      <div className="settings-row-text">
                          <span className="settings-row-title">{t("familyData.cleanup.title")}</span>
                          <span className="muted">{t("familyData.cleanup.text")}</span>
                      </div>
                  </div>
              </div>
          </section>

          <section className="panel danger-zone">
              <h2>{t("familyData.delete.title")}</h2>
              <p>{t("familyData.delete.text", { family: organization.name })}</p>
              <ul>
                  <li>{t("familyData.delete.what1")}</li>
                  <li>{t("familyData.delete.what2")}</li>
                  <li>{t("familyData.delete.what3")}</li>
              </ul>
              <p className="muted">{t("familyData.delete.tip")}</p>
              <label className="danger-confirm">
                  <span>{t("familyData.delete.confirmLabel", { family: organization.name })}</span>
                  <input
                      value={confirmName}
                      onChange={(e) => setConfirmName(e.target.value)}
                      placeholder={organization.name}
                      autoComplete="off"
                  />
              </label>
              {deleteFailed && <p className="error">{t("familyData.delete.failed")}</p>}
              <button className="danger-button" onClick={onDelete} disabled={!nameMatches || deleting}>
                  <FieldIcon name="trash" size={16} />{deleting ? t("familyData.delete.deleting") : t("familyData.delete.button")}
              </button>
          </section>
      </div>
  )
}

export default FamilyData
