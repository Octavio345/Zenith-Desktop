import { useEffect, useRef, useState } from "react"
import MultispectralLoader from "./MultispectralLoader"
import MultispectralResults from "./MultispectralResults"
import MultispectralUpload from "./MultispectralUpload"
import MultispectralPrepare from "./MultispectralPrepare"
import { analyzeMultispectral, MULTISPECTRAL_DEFAULTS } from "../../../../services/multispectralApi"
import "../../../../styles/App/MultispectralAnalysis.css"
import "../../../../styles/App/MultispectralPrepare.css"

const EMPTY_FILES = Object.freeze({ green: null, red: null, redEdge: null, nir: null, blue: null, thermal: null })
const TIFF_EXTENSION = /\.tiff?$/i
const DJI_CAPTURE = /^(DJI_DateTime_.+_alt_[^_]+m)_(G|R|RE|NIR|B|T)\.tiff?$/i
const DJI_BANDS = Object.freeze({ green: "G", red: "R", redEdge: "RE", nir: "NIR", blue: "B", thermal: "T" })
const MAVIC_3M_CAPTURE = /^(DJI_\d{14}_\d{4})_MS_(G|R|RE|NIR)\.tiff?$/i
const MICASENSE_CAPTURE = /^(IMG_\d{4,})_([1-7])\.tiff?$/i
const MICASENSE_BANDS = Object.freeze({ green: "2", red: "3", redEdge: "5", nir: "4", blue: "1", thermal: "7" })

function fileIdentity(file) {
  return `${file.name.toLowerCase()}::${file.size}::${file.lastModified}`
}

function knownCameraFile(file) {
  const name = file?.name || ""
  const dji = name.match(DJI_CAPTURE) || name.match(MAVIC_3M_CAPTURE)
  if (dji) return { capture: `dji:${dji[1].toLowerCase()}`, band: dji[2].toUpperCase(), family: "DJI" }
  const micasense = name.match(MICASENSE_CAPTURE)
  if (micasense) return { capture: `micasense:${micasense[1].toLowerCase()}`, band: micasense[2], family: "MicaSense" }
  return null
}

export default function MultispectralAnalysis() {
  const [files, setFiles] = useState({ ...EMPTY_FILES })
  const [settings, setSettings] = useState({ ...MULTISPECTRAL_DEFAULTS })
  const [result, setResult] = useState(null)
  const [error, setError] = useState("")
  const [status, setStatus] = useState("idle")
  const [mode, setMode] = useState("analysis")
  const [isPreparing, setIsPreparing] = useState(false)
  const [preparedNotice, setPreparedNotice] = useState("")
  const requestControllerRef = useRef(null)

  const isAnalyzing = status !== "idle"

  useEffect(() => () => requestControllerRef.current?.abort(), [])

  const selectFile = (bandId, file) => {
    setError("")
    setPreparedNotice("")
    if (!(file instanceof File) || !TIFF_EXTENSION.test(file.name)) {
      setError("Use um arquivo no formato .tif ou .tiff para cada banda.")
      return
    }
    const cameraFile = knownCameraFile(file)
    const expectedBand = cameraFile?.family === "MicaSense" ? MICASENSE_BANDS[bandId] : DJI_BANDS[bandId]
    if (cameraFile && cameraFile.band !== expectedBand) {
      setError(`O nome deste arquivo ${cameraFile.family} indica outra faixa espectral. Confira a banda selecionada.`)
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
    setPreparedNotice("")
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
    const captures = [files.green, files.red, files.redEdge, files.nir].map(knownCameraFile).filter(Boolean).map((file) => file.capture)
    if (captures.length > 1 && new Set(captures).size > 1) {
      setError("As bandas são de capturas diferentes. Selecione Green, Red, Red Edge e NIR da mesma captura.")
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
        settings,
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
    setPreparedNotice("")
    setStatus("idle")
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }))
  }

  const usePrepared = (readyFiles, summary) => {
    setFiles({ ...EMPTY_FILES, ...readyFiles })
    setSettings((current) => ({
      ...current,
      reflectanceScale: Number(summary.reflectance_scale) || 1,
      thermalUnit: "celsius",
      assumeAligned: true,
    }))
    setResult(null)
    setError("")
    setPreparedNotice("As bandas processadas foram preenchidas. Confira os arquivos e os parâmetros antes de analisar.")
    setMode("analysis")
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

      <div className="ms-context-banner" role="note" aria-label="Requisito para a análise multiespectral">
        <span className="material-symbols-outlined" aria-hidden="true">photo_camera</span>
        <div>
          <strong>Importante: esta análise exige um drone equipado com câmera multiespectral.</strong>
          <p>Envie mapas calibrados e alinhados das bandas Verde, Vermelha, Red Edge e NIR. Capturas brutas precisam de processamento antes. Temperatura requer um sensor térmico radiométrico; fotos RGB comuns não fornecem essas medidas.</p>
        </div>
      </div>

      <nav className="ms-workflow-tabs" aria-label="Etapas da análise multiespectral">
        <button type="button" className={mode === "analysis" ? "is-active" : ""} aria-current={mode === "analysis" ? "page" : undefined} onClick={() => setMode("analysis")} disabled={isAnalyzing || isPreparing}>
          <span className="material-symbols-outlined" aria-hidden="true">analytics</span> Analisar bandas
        </button>
        <button type="button" className={mode === "prepare" ? "is-active" : ""} aria-current={mode === "prepare" ? "page" : undefined} onClick={() => setMode("prepare")} disabled={isAnalyzing || isPreparing}>
          <span className="material-symbols-outlined" aria-hidden="true">tune</span> Preparar arquivos brutos <small>Opcional</small>
        </button>
      </nav>

      <div hidden={mode !== "prepare"}>
        <MultispectralPrepare onUsePrepared={usePrepared} onBusyChange={setIsPreparing} />
      </div>

      {mode !== "prepare" && (isAnalyzing ? (
        <MultispectralLoader status={status} onCancel={cancel} />
      ) : result ? (
        <MultispectralResults result={result} onRestart={restart} />
      ) : (
        <>
          {preparedNotice && <div className="ms-prepared-notice" role="status"><span className="material-symbols-outlined" aria-hidden="true">check_circle</span>{preparedNotice}</div>}
          <MultispectralUpload
            files={files}
            settings={settings}
            onSettingsChange={(key, value) => setSettings((current) => ({ ...current, [key]: value }))}
            error={error}
            disabled={isAnalyzing}
            onSelect={selectFile}
            onRemove={removeFile}
            onAnalyze={analyze}
          />
        </>
      ))}
    </div>
  )
}
