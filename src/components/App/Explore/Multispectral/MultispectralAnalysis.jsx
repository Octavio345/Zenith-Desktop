import { useEffect, useRef, useState } from "react"
import MultispectralLoader from "./MultispectralLoader"
import MultispectralResults from "./MultispectralResults"
import MultispectralUpload from "./MultispectralUpload"
import { analyzeMultispectral } from "../../../../services/multispectralApi"
import "../../../../styles/App/MultispectralAnalysis.css"

const EMPTY_FILES = Object.freeze({ green: null, red: null, redEdge: null, nir: null, blue: null, thermal: null })
const TIFF_EXTENSION = /\.tiff?$/i

function fileIdentity(file) {
  return `${file.name.toLowerCase()}::${file.size}::${file.lastModified}`
}

export default function MultispectralAnalysis() {
  const [files, setFiles] = useState({ ...EMPTY_FILES })
  const [result, setResult] = useState(null)
  const [error, setError] = useState("")
  const [status, setStatus] = useState("idle")
  const requestControllerRef = useRef(null)

  const isAnalyzing = status !== "idle"

  useEffect(() => () => requestControllerRef.current?.abort(), [])

  const selectFile = (bandId, file) => {
    setError("")
    if (!(file instanceof File) || !TIFF_EXTENSION.test(file.name)) {
      setError("Use um arquivo no formato .tif ou .tiff para cada banda.")
      return
    }

    const duplicateBand = Object.entries(files).find(([currentBand, currentFile]) => (
      currentBand !== bandId && currentFile && fileIdentity(currentFile) === fileIdentity(file)
    ))

    if (duplicateBand) {
      setError("Este mesmo arquivo já foi associado a outra banda. Selecione a imagem correspondente a esta faixa espectral.")
      return
    }

    setFiles((current) => ({ ...current, [bandId]: file }))
  }

  const removeFile = (bandId) => {
    setError("")
    setFiles((current) => ({ ...current, [bandId]: null }))
  }

  const analyze = async () => {
    const missing = ["green", "red", "redEdge", "nir"].filter((band) => !files[band])
    if (missing.length > 0) {
      setError("Adicione as bandas Green, Red, Red Edge e NIR para iniciar a análise.")
      return
    }

    const identities = [files.green, files.red, files.redEdge, files.nir].map(fileIdentity)
    if (new Set(identities).size !== identities.length) {
      setError("Cada banda obrigatória precisa usar um arquivo diferente.")
      return
    }

    setError("")
    setResult(null)
    setStatus("connecting")
    const controller = new AbortController()
    requestControllerRef.current = controller

    try {
      const analysis = await analyzeMultispectral(files, {
        signal: controller.signal,
        onStatus: setStatus,
      })
      setResult(analysis)
      setStatus("idle")
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }))
    } catch (analysisError) {
      if (!controller.signal.aborted) setError(analysisError.message)
      setStatus("idle")
    } finally {
      if (requestControllerRef.current === controller) requestControllerRef.current = null
    }
  }

  const cancel = () => {
    requestControllerRef.current?.abort()
    requestControllerRef.current = null
    setStatus("idle")
    setError("A análise foi cancelada. Seus arquivos continuam selecionados.")
  }

  const restart = () => {
    requestControllerRef.current?.abort()
    requestControllerRef.current = null
    setFiles({ ...EMPTY_FILES })
    setResult(null)
    setError("")
    setStatus("idle")
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }))
  }

  return (
    <div className="ms-analysis-container">
      <header className="ms-page-header">
        <div>
          <span className="ms-eyebrow"><span className="material-symbols-outlined">satellite_alt</span> Levantamento por drone</span>
          <h1>Análise <span>multiespectral</span></h1>
          <p>Localize respostas diferentes do padrão da vegetação e direcione a inspeção em campo com apoio de índices espectrais.</p>
        </div>
        <aside>
          <span className="material-symbols-outlined">verified_user</span>
          <div><strong>Triagem agronômica</strong><small>Não substitui diagnóstico em campo</small></div>
        </aside>
      </header>

      <div className="ms-context-banner">
        <span className="material-symbols-outlined">compare_arrows</span>
        <p><strong>Este fluxo é diferente do diagnóstico por foto RGB.</strong> Aqui, o Zenith analisa bandas multiespectrais capturadas por drone para identificar possíveis alterações fisiológicas.</p>
      </div>

      {isAnalyzing ? (
        <MultispectralLoader status={status} onCancel={cancel} />
      ) : result ? (
        <MultispectralResults result={result} onRestart={restart} />
      ) : (
        <MultispectralUpload
          files={files}
          error={error}
          disabled={isAnalyzing}
          onSelect={selectFile}
          onRemove={removeFile}
          onAnalyze={analyze}
        />
      )}
    </div>
  )
}
