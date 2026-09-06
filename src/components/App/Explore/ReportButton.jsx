import { useState } from "react"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "../../../services/firebase"

export default function ReportButton({ kind = "triagem", result, images, context, className }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  async function download() {
    if (busy) return
    setBusy(true); setError("")
    try {
      const user = auth.currentUser
      if (!user) throw new Error("Entre na sua conta para emitir o relatório.")
      let profile = null
      // Read only: avoid the legacy profile helper, which may migrate accounts.
      for (const name of ["owners", "employees", "users"]) {
        const snapshot = await getDoc(doc(db, name, user.uid))
        if (snapshot.exists()) { profile = snapshot.data(); break }
      }
      if (auth.currentUser?.uid !== user.uid) throw new Error("A conta mudou. Gere o relatório novamente.")
      const digits = String(profile?.document || "").replace(/\D/g, "")
      const isCPF = profile?.type === "CPF" && digits.length === 11
      const isCNPJ = profile?.type === "PJ" && digits.length === 14
      const userDocument = isCPF ? digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
        : isCNPJ ? digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5") : undefined
      const { createAnalysisReport } = await import("../../../services/analysisReport")
      const { doc: pdf, filename } = await createAnalysisReport({ kind, result, images, context: {
        ...context, userName: profile?.name || user.displayName || undefined,
        userDocument, documentLabel: isCPF ? "CPF" : "CNPJ"
      } })
      pdf.save(filename)
    } catch (e) {
      setError(e?.message || "Não foi possível gerar o relatório. Tente novamente.")
    } finally { setBusy(false) }
  }
  return <>
    <button type="button" className={className} disabled={busy} onClick={download} aria-busy={busy}>
      <span className="material-symbols-outlined">picture_as_pdf</span>
      {busy ? "Gerando relatório…" : "Gerar relatório PDF"}
    </button>
    {error && <p role="alert">{error}</p>}
  </>
}
