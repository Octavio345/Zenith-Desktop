import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import CameraView from "./CameraView"
import BatchImagePreview from "./BatchImagePreview"
import BatchDiagnosisResult from "./BatchDiagnosisResult"
import AnalysisLoader from "./AnalysisLoader"
import DiagnosisResult from "./DiagnosisResult"
import AllHistory from "./AllHistory"
import FieldAreaPicker from "./FieldAreaPicker"
import FeatureAccessPanel from "../FeatureAccessPanel"
import { formatDiagnosisName } from "./diagnosisLabels"
import { useFeatureAccess } from "../../../../hooks/useFeatureAccess"
import { diagnosticarLote } from "../../../../services/sojaApi"
import { createOccurrenceFromAnalysis, saveActivityDraft } from "../../../../services/fieldOperations"
import "../../../../styles/App/Diagnostico.css"
import "../../../../styles/App/BatchDiagnosis.css"

const MAX_BATCH_IMAGES = 100
const MAX_FILE_SIZE = 20 * 1024 * 1024
const MAX_BATCH_SIZE = 500 * 1024 * 1024
const ACCEPTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const ACCEPTED_EXTENSIONS = /\.(jpe?g|png|webp)$/i

const checkIsMobile = () => window.innerWidth < 1025

function createImageId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function isSupportedImage(file) {
  if (!(file instanceof File)) return false
  return ACCEPTED_MIME_TYPES.has(file.type) || (!file.type && ACCEPTED_EXTENSIONS.test(file.name))
}

function fileIdentity(file) {
  return `${file.name}::${file.size}::${file.lastModified}`
}

export default function DiagnosticoTab() {
  const videoRef = useRef(null)
  const fileInputRef = useRef(null)
  const selectedImagesRef = useRef([])
  const requestControllerRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const diagnosisAccess = useFeatureAccess("diagnosis")

  const [step, setStep] = useState("start")
  const [selectedImages, setSelectedImages] = useState([])
  const [result, setResult] = useState(null)
  const [reportContext, setReportContext] = useState({})
  const [history, setHistory] = useState([])
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [isMobile, setIsMobile] = useState(checkIsMobile)
  const [isDraggingImage, setIsDraggingImage] = useState(false)
  const [selectionNotice, setSelectionNotice] = useState(null)
  const [fieldAreas, setFieldAreas] = useState([])
  const [selectedFieldAreaId, setSelectedFieldAreaId] = useState("")
  const [customFieldAreaName, setCustomFieldAreaName] = useState("")

  useEffect(() => {
    selectedImagesRef.current = selectedImages
  }, [selectedImages])

  useEffect(() => {
    const handleResize = () => setIsMobile(checkIsMobile())
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    try {
      const areas = JSON.parse(localStorage.getItem("farmPolygons") || "[]")
      setFieldAreas(Array.isArray(areas) ? areas : [])
    } catch {
      setFieldAreas([])
    }
  }, [])

  useEffect(() => {
    if (location.state?.showHistory) setShowAllHistory(true)
    if (location.state?.showResult && location.state?.diagnosticData) {
      const diagnostic = location.state.diagnosticData
      setReportContext({ analyzedAt: diagnostic.date, id: diagnostic.id, fieldAreaName: diagnostic.fieldAreaName })
      setResult({
        status: diagnostic.status || "ok",
        doenca: formatDiagnosisName(diagnostic.disease),
        confianca: diagnostic.confidence,
        probabilidades: {}
      })
      setStep("result")
    }
  }, [location])

  useEffect(() => {
    try {
      const saved = localStorage.getItem("diagnosticHistory")
      if (saved) setHistory(JSON.parse(saved))
    } catch {

    }
  }, [])

  useEffect(() => {
    return () => {
      selectedImagesRef.current.forEach((image) => URL.revokeObjectURL(image.preview))
      requestControllerRef.current?.abort()
      videoRef.current?.srcObject?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const persistHistoryItem = (item) => {
    setHistory((currentHistory) => {
      const updated = [item, ...currentHistory].slice(0, 20)
      try {
        localStorage.setItem("diagnosticHistory", JSON.stringify(updated))
      } catch {

      }
      return updated
    })
  }

  const saveBatchToHistory = (data) => {
    const general = data?.resultado_geral
    if (!general) return

    const conditions = general.ocorrencias_confiaveis || []
    let title = "Lote inconclusivo"

    if (conditions.length > 1) title = `${conditions.length} condições detectadas`
    else if (conditions.length === 1) title = formatDiagnosisName(conditions[0].classe)
    else if (general.condicao_predominante) title = formatDiagnosisName(general.condicao_predominante)

    const fieldArea = getFieldAreaContext()
    persistHistoryItem({
      id: Date.now(),
      type: "batch",
      disease: title,
      confidence: Math.max(0, Math.min(100, Math.round(Number(general.confianca_media) || 0))),
      date: new Date().toLocaleString("pt-BR"),
      imageCount: Number(general.total_recebidas) || selectedImages.length,
      reliableCount: Number(general.resultados_confiaveis) || 0,
      conditionCount: conditions.length,
      status: general.status,
      fieldAreaId: fieldArea?.id || "",
      fieldAreaName: fieldArea?.name || "Talhão não informado"
    })
  }

  const getFieldAreaContext = () => {
    if (selectedFieldAreaId === "__custom__") {
      const name = customFieldAreaName.trim()
      return name ? { id: "", name } : null
    }
    return fieldAreas.find((area) => area.id === selectedFieldAreaId) || null
  }

  const createInspectionTask = () => {
    const fieldArea = getFieldAreaContext()
    const occurrence = createOccurrenceFromAnalysis({
      result,
      fieldArea,
      imageCount: selectedImages.length
    })
    const general = result?.resultado_geral || result || {}
    const confidence = general.confianca_media ?? general.confianca ?? general.confidence
    const condition = (general.status || "ok") === "ok"
      ? formatDiagnosisName(general.condicao_predominante || general.resultado || general.doenca || general.disease || "Inconclusivo")
      : "Resultado inconclusivo ou sem classe única; conferir as imagens e confirmar em campo"
    const description = [
      "Análise realizada pelo Zenith.",
      `Classe mais provável: ${condition}.`,
      confidence != null && Number.isFinite(Number(confidence)) ? `Confiança do modelo: ${Math.round(Number(confidence))}%.` : null,
      fieldArea?.name ? `Talhão relacionado: ${fieldArea.name}.` : null,
      "Realizar vistoria em campo para confirmação antes de qualquer intervenção."
    ].filter(Boolean).join("\n")
    saveActivityDraft({
      title: "Confirmar possível ocorrência fitossanitária",
      description,
      type: "tarefa",
      priority: occurrence.confidence >= 75 ? "alta" : "media",
      source: "diagnostico_ia",
      fieldAreaId: occurrence.fieldAreaId,
      fieldAreaName: occurrence.fieldAreaName,
      occurrenceId: occurrence.id
    })
    navigate("/explore", { state: { activeTab: "atividades" } })
  }

  const stopCamera = () => {
    videoRef.current?.srcObject?.getTracks().forEach((track) => track.stop())
  }

  const startCamera = async () => {
    setSelectionNotice(null)
    setStep("camera")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      })
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch (error) {
      console.error("Câmera:", error)
      setSelectionNotice({
        type: "warning",
        text: "Não foi possível acessar a câmera. Verifique a permissão do navegador ou selecione fotos da galeria."
      })
      setStep("start")
    }
  }

  const addSelectedFiles = (fileList) => {
    const incomingFiles = Array.from(fileList || [])
    if (incomingFiles.length === 0) return

    const existingFiles = new Set(selectedImages.map((image) => fileIdentity(image.file)))
    const currentBatchSize = selectedImages.reduce((total, image) => total + image.file.size, 0)
    const accepted = []
    let acceptedSize = 0
    let unsupported = 0
    let oversized = 0
    let duplicated = 0
    let exceeded = 0
    let batchSizeExceeded = 0

    incomingFiles.forEach((file) => {
      if (!isSupportedImage(file)) {
        unsupported += 1
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        oversized += 1
        return
      }

      const identity = fileIdentity(file)
      if (existingFiles.has(identity)) {
        duplicated += 1
        return
      }
      if (selectedImages.length + accepted.length >= MAX_BATCH_IMAGES) {
        exceeded += 1
        return
      }
      if (currentBatchSize + acceptedSize + file.size > MAX_BATCH_SIZE) {
        batchSizeExceeded += 1
        return
      }

      existingFiles.add(identity)
      acceptedSize += file.size
      accepted.push({
        id: createImageId(),
        file,
        preview: URL.createObjectURL(file)
      })
    })

    if (accepted.length > 0) {
      setSelectedImages((current) => [...current, ...accepted])
      setStep("preview")
    }

    const problems = []
    if (unsupported) problems.push(`${unsupported} em formato não compatível`)
    if (oversized) problems.push(`${oversized} acima de 20 MB`)
    if (duplicated) problems.push(`${duplicated} duplicada${duplicated > 1 ? "s" : ""}`)
    if (exceeded) problems.push(`${exceeded} acima do limite de ${MAX_BATCH_IMAGES}`)
    if (batchSizeExceeded) problems.push(`${batchSizeExceeded} acima do limite total de 500 MB`)

    if (problems.length > 0) {
      setSelectionNotice({
        type: "warning",
        text: `${accepted.length ? `${accepted.length} adicionada${accepted.length > 1 ? "s" : ""}. ` : ""}Ignoradas: ${problems.join(", ")}.`
      })
    } else {
      setSelectionNotice(null)
    }
  }

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight) return

    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d").drawImage(video, 0, 0)

    canvas.toBlob((blob) => {
      if (!blob) return
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
      const cameraFile = new File([blob], `captura-soja-${timestamp}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now()
      })
      stopCamera()
      addSelectedFiles([cameraFile])
    }, "image/jpeg", 0.92)
  }

  const openGallery = () => fileInputRef.current?.click()

  const handleGalleryImages = (event) => {
    addSelectedFiles(event.target.files)
    event.target.value = ""
  }

  const handleDragOverImage = (event) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDraggingImage(true)
  }

  const handleDragLeaveImage = (event) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDraggingImage(false)
  }

  const handleDropImage = (event) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDraggingImage(false)
    addSelectedFiles(event.dataTransfer.files)
  }

  const removeSelectedImage = (imageId) => {
    const imageToRemove = selectedImages.find((image) => image.id === imageId)
    if (imageToRemove) URL.revokeObjectURL(imageToRemove.preview)

    const remaining = selectedImages.filter((image) => image.id !== imageId)
    setSelectedImages(remaining)
    if (remaining.length === 0) {
      setSelectionNotice(null)
      setStep("start")
    }
  }

  const clearSelectedImages = () => {
    selectedImages.forEach((image) => URL.revokeObjectURL(image.preview))
    setSelectedImages([])
    setSelectionNotice(null)
  }

  const analyzeBatch = async () => {
    if (selectedImages.length === 0) return

    const permission = await diagnosisAccess.consume()
    if (!permission.allowed) {
      if (permission.limitReached) setStep("start")
      else if (!permission.pending) {
        setSelectionNotice({ type: "warning", text: "Não foi possível verificar o acesso à análise. Tente novamente." })
      }
      return
    }

    const controller = new AbortController()
    requestControllerRef.current = controller
    setReportContext({ fieldAreaName: getFieldAreaContext()?.name })
    setStep("analysis")

    try {
      const data = await diagnosticarLote(selectedImages, { signal: controller.signal })
      setReportContext((current) => ({ ...current, analyzedAt: new Date().toLocaleString("pt-BR") }))
      setResult(data)
      saveBatchToHistory(data)
    } catch (error) {
      if (controller.signal.aborted) return
      setResult({
        status: error?.status ? "erro_api" : "erro_conexao",
        resultado: "Erro",
        mensagem: error?.message || "Não foi possível analisar o lote agora. Verifique a conexão e tente novamente."
      })
    } finally {
      if (!controller.signal.aborted) setStep("result")
      if (requestControllerRef.current === controller) requestControllerRef.current = null
    }
  }

  const reset = () => {
    stopCamera()
    clearSelectedImages()
    setResult(null)
    setStep("start")
  }

  const backFromHistory = () => {
    setShowAllHistory(false)
    try {
      const saved = localStorage.getItem("diagnosticHistory")
      if (saved) setHistory(JSON.parse(saved))
    } catch {

    }
  }

  const galleryInput = (
    <input
      type="file"
      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
      multiple
      ref={fileInputRef}
      className="hidden-input"
      onChange={handleGalleryImages}
    />
  )

  if (showAllHistory) return <AllHistory onBack={backFromHistory} />
  if (step === "camera") return <CameraView videoRef={videoRef} onCapture={capturePhoto} onCancel={reset} />
  if (step === "preview") {
    return (
      <>
        <BatchImagePreview
          images={selectedImages}
          notice={selectionNotice}
          fieldAreas={fieldAreas}
          fieldAreaId={selectedFieldAreaId}
          fieldAreaName={customFieldAreaName}
          onFieldAreaChange={(value) => {
            setSelectedFieldAreaId(value)
            if (value !== "__custom__") setCustomFieldAreaName("")
          }}
          onFieldAreaNameChange={setCustomFieldAreaName}
          onAddImages={openGallery}
          onRemoveImage={removeSelectedImage}
          onBack={reset}
          onAnalyze={analyzeBatch}
        />
        {galleryInput}
      </>
    )
  }
  if (step === "analysis") return <AnalysisLoader imageCount={selectedImages.length} />
  if (step === "result" && result?.resultado_geral) {
    return <BatchDiagnosisResult result={result} selectedImages={selectedImages} onRestart={reset} onCreateInspection={createInspectionTask} reportContext={reportContext} allowThreeD={diagnosisAccess.fullAccess} />
  }
  if (step === "result" && selectedImages.length > 0) {
    return <BatchDiagnosisResult result={result} selectedImages={selectedImages} onRestart={reset} onCreateInspection={createInspectionTask} reportContext={reportContext} allowThreeD={diagnosisAccess.fullAccess} />
  }
  if (step === "result") return <DiagnosisResult result={result} onRestart={reset} onCreateInspection={createInspectionTask} reportContext={reportContext} />

  return (
    <div className="diagnostic-container">
      <div className="diagnostic-header">
        <div className="header-glow" />
        <span className="batch-eyebrow">INTELIGÊNCIA ARTIFICIAL NO CAMPO</span>
        <h1 className="diagnostico-title">Análise da soja <span className="highlight">por IA</span></h1>
        <p>
          Envie até <span className="highlight">100 fotos da soja</span> para identificar possíveis problemas.
          Veja o resultado de cada foto e confirme em campo com um profissional.
        </p>
      </div>

      <FeatureAccessPanel feature="diagnosis" access={{ ...diagnosisAccess, refresh: diagnosisAccess.refresh }} />

      {(diagnosisAccess.fullAccess || diagnosisAccess.remaining > 0) && !diagnosisAccess.error && <>

      <section className="diagnostic-field-context" aria-labelledby="diagnostic-field-context-title">
        <span className="material-symbols-outlined">location_on</span>
        <div>
          <strong id="diagnostic-field-context-title">Área das fotos <em>opcional</em></strong>
          <small>Escolha um talhão salvo no mapa ou digite o nome da área fotografada.</small>
        </div>
        <FieldAreaPicker
          areas={fieldAreas}
          selectedAreaId={selectedFieldAreaId}
          customName={customFieldAreaName}
          onSelect={setSelectedFieldAreaId}
          onCustomNameChange={setCustomFieldAreaName}
          className="diagnostic-field-select"
        />
      </section>

      {selectionNotice?.text && (
        <div className="batch-start-notice" role="status">
          <span className="material-symbols-outlined">warning</span>
          <span>{selectionNotice.text}</span>
        </div>
      )}

      <div className="diagnostic-main-grid">
        {isMobile && (
          <button type="button" className="option-card camera-card" onClick={startCamera}>
            <div className="card-glow" />
            <div className="option-icon-wrapper">
              <div className="option-icon">
                <span className="material-symbols-outlined">photo_camera</span>
              </div>
            </div>
            <h3>Tirar foto</h3>
            <p>Fotografe uma folha de soja para analisar.</p>
            <div className="card-action">
              <span>Usar câmera</span>
              <span className="material-symbols-outlined arrow" aria-hidden="true">arrow_forward</span>
            </div>
          </button>
        )}

        <button
          type="button"
          className={`option-card gallery-card ${isDraggingImage ? "drag-active" : ""}`}
          onClick={openGallery}
          onDragEnter={handleDragOverImage}
          onDragOver={handleDragOverImage}
          onDragLeave={handleDragLeaveImage}
          onDrop={handleDropImage}
        >
          <div className="card-glow" />
          <div className="option-icon-wrapper">
            <div className="option-icon">
              <span className="material-symbols-outlined">add_photo_alternate</span>
            </div>
          </div>
          <h3>Analisar fotos do drone</h3>
          <p>Escolha as fotos no seu dispositivo ou arraste-as para cá.</p>
          <div className="card-action">
            <span>Selecionar imagens</span>
            <span className="material-symbols-outlined arrow" aria-hidden="true">arrow_forward</span>
          </div>
        </button>

        <div className="history-card">
          <div className="history-header">
            <h3 className="history-title">Análises recentes</h3>
            {history.length > 2 && (
              <button type="button" className="section-link" onClick={() => setShowAllHistory(true)}>
                Ver todas
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            )}
          </div>

          <div className="history-list">
            {history.length === 0 ? (
              <div className="empty-history">
                <div className="empty-icon">
                  <span className="material-symbols-outlined">biotech</span>
                </div>
                <p className="empty-title">Nenhuma análise</p>
                <p className="empty-description">Envie fotos da lavoura para começar.</p>
              </div>
            ) : (
              history.slice(0, 2).map((item) => (
                <div key={item.id} className="history-item">
                  <div className="history-icon">
                    <span className="material-symbols-outlined">{item.type === "batch" ? "flight" : "eco"}</span>
                  </div>
                  <div className="history-info">
                    <div className="history-name">{formatDiagnosisName(item.disease)}</div>
                    <div className="history-date">
                      {item.type === "batch" && item.imageCount ? `${item.imageCount} fotos • ` : ""}{item.date}
                    </div>
                  </div>
                  <div className="history-confidence" title="Confiança média">
                    <div className="confidence-value">{item.confidence}%</div>
                    <div className="confidence-bar">
                      <div className="confidence-fill" style={{ width: `${Math.min(100, item.confidence)}%` }} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {galleryInput}
      </>}
    </div>
  )
}
