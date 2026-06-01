import { useState, useRef, useEffect } from "react"
import { useLocation } from "react-router-dom"
import CameraView from "./CameraView"
import ImagePreview from "./ImagePreview"
import AnalysisLoader from "./AnalysisLoader"
import DiagnosisResult from "./DiagnosisResult"
import AllHistory from "./AllHistory"
import { formatDiagnosisName } from "./diagnosisLabels"
import "../../../../styles/App/Diagnostico.css"

const API_URL = "https://tccamsamericana-api-doencas-soja.hf.space/predict"

const checkIsMobile = () => window.innerWidth < 1025

const isDiagnosticHistoryItem = (data) => {
  return data?.status === "ok" && Boolean(data?.resultado || data?.doenca || data?.disease)
}

export default function DiagnosticoTab() {
  const videoRef = useRef(null)
  const fileInputRef = useRef(null)
  const location = useLocation()

  const [step, setStep] = useState("start")
  const [image, setImage] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [isMobile, setIsMobile] = useState(checkIsMobile)
  const [isDraggingImage, setIsDraggingImage] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(checkIsMobile())
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    if (location.state?.showHistory) setShowAllHistory(true)
    if (location.state?.showResult && location.state?.diagnosticData) {
      const d = location.state.diagnosticData
      setResult({ doenca: formatDiagnosisName(d.disease), confianca: d.confidence, probabilidades: {} })
      setStep("result")
    }
  }, [location])

  useEffect(() => {
    try {
      const saved = localStorage.getItem("diagnosticHistory")
      if (saved) setHistory(JSON.parse(saved))
    } catch { }
  }, [])

  const saveToHistory = (data) => {
    if (!isDiagnosticHistoryItem(data)) return

    let diseaseName = "Desconhecido", confidence = 0
    if (data?.resultado) { diseaseName = data.resultado; confidence = data.confianca }
    else if (data?.doenca) { diseaseName = data.doenca; confidence = data.confianca }
    else if (data?.disease) { diseaseName = data.disease; confidence = data.confidence }
    else if (data?.classe) { diseaseName = data.classe; confidence = (data.probabilidade || 0) * 100 }
    else if (data?.label) { diseaseName = data.label; confidence = (data.score || 0) * 100 }
    else if (data?.prediction) { diseaseName = data.prediction; confidence = (data.probability || 0) * 100 }
    if (confidence <= 1) confidence = Math.round(confidence * 100)
    else confidence = Math.min(100, Math.round(confidence))
    const item = {
      id: Date.now(),
      disease: formatDiagnosisName(diseaseName),
      confidence,
      date: new Date().toLocaleString("pt-BR")
    }
    const updated = [item, ...history].slice(0, 20)
    setHistory(updated)
    try { localStorage.setItem("diagnosticHistory", JSON.stringify(updated)) } catch { }
  }

  const startCamera = async () => {
    setStep("camera")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch (err) { console.error("Câmera:", err) }
  }

  const stopCamera = () => { videoRef.current?.srcObject?.getTracks().forEach(t => t.stop()) }

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d").drawImage(video, 0, 0)
    setImage(canvas.toDataURL("image/jpeg"))
    setImageFile(null)
    stopCamera()
    setStep("preview")
  }

  const readFileAsDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (ev) => resolve(ev.target.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const loadPreviewImage = (source) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = source
    })
  }

  const createJpegFromPreview = async (source) => {
    const previewImage = await loadPreviewImage(source)
    const canvas = document.createElement("canvas")
    canvas.width = previewImage.naturalWidth || previewImage.width
    canvas.height = previewImage.naturalHeight || previewImage.height

    const ctx = canvas.getContext("2d")
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(previewImage, 0, 0)

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92))
    if (!blob) throw new Error("Nao foi possivel converter a imagem.")

    return new File([blob], "image.jpg", { type: "image/jpeg" })
  }

  const openGallery = () => fileInputRef.current?.click()

  const isImageFile = (file) => file?.type?.startsWith("image/")

  const handleGalleryImage = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!isImageFile(file)) {
      e.target.value = ""
      return
    }

    const dataUrl = await readFileAsDataUrl(file)
    setImage(dataUrl)
    setImageFile(file)
    setStep("preview")
    e.target.value = ""
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

  const handleDropImage = async (event) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDraggingImage(false)

    const file = event.dataTransfer.files?.[0]
    if (!isImageFile(file)) return

    const dataUrl = await readFileAsDataUrl(file)
    setImage(dataUrl)
    setImageFile(file)
    await analyzeImage(file, dataUrl)
  }

  const appendImageToFormData = async (formData, source) => {
    if (source instanceof File) {
      formData.append("file", source, source.name || "image.jpg")
      return
    }

    const blob = await fetch(source).then(r => r.blob())
    const type = blob.type || "image/jpeg"
    const extension = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg"
    formData.append("file", new File([blob], `image.${extension}`, { type }))
  }

  const sendImageToApi = async (source) => {
    const formData = new FormData()
    await appendImageToFormData(formData, source)
    const response = await fetch(API_URL, { method: "POST", body: formData })
    const data = await response.json().catch(() => null)
    return { response, data }
  }

  const analyzeImage = async (source, previewSource = image) => {
    const fileToAnalyze = source instanceof File ? source : imageFile
    const imageToAnalyze = typeof source === "string" ? source : previewSource
    if (!fileToAnalyze && !imageToAnalyze) return

    setStep("analysis")
    try {
      let { response, data } = await sendImageToApi(fileToAnalyze || imageToAnalyze)

      if (!response.ok && response.status === 400 && imageToAnalyze) {
        try {
          const jpegFile = await createJpegFromPreview(imageToAnalyze)
          const retry = await sendImageToApi(jpegFile)
          response = retry.response
          data = retry.data
        } catch { }
      }

      if (!response.ok) {
        setResult({
          status: "erro_api",
          resultado: "Erro",
          mensagem: data?.detail || `Erro ${response.status} ao analisar imagem.`
        })
        setStep("result")
        return
      }

      setResult(data)
      saveToHistory(data)
      setStep("result")
    } catch (err) {
      setResult({
        status: "erro_conexao",
        resultado: "Erro",
        mensagem: "Não foi possível analisar a imagem agora. Verifique a conexão ou tente novamente em alguns instantes."
      })
      setStep("result")
    }
  }

  const reset = () => { setImage(null); setImageFile(null); setResult(null); setStep("start") }
  const backFromHistory = () => {
    setShowAllHistory(false)
    try {
      const saved = localStorage.getItem("diagnosticHistory")
      if (saved) setHistory(JSON.parse(saved))
    } catch { }
  }

  if (showAllHistory) return <AllHistory onBack={backFromHistory} />
  if (step === "camera") return <CameraView videoRef={videoRef} onCapture={capturePhoto} onCancel={reset} />
  if (step === "preview") return <ImagePreview image={image} onBack={reset} onAnalyze={() => analyzeImage()} />
  if (step === "analysis") return <AnalysisLoader />
  if (step === "result") return <DiagnosisResult result={result} onRestart={reset} />

  return (
    <div className="diagnostic-container">
      {/* Cabeçalho */}
      <div className="diagnostic-header">
        <div className="header-glow" />
        <h1 className="diagnostico-title">Diagnóstico <span className="highlight">por IA</span></h1>
        <p>Identifique doenças em folhas de soja com <span className="highlight">visão computacional</span> de alta precisão.</p>
      </div>

      {/* Container principal com câmera, galeria e histórico */}
      <div className="diagnostic-main-grid">
        {/* Coluna esquerda - Câmera (apenas mobile) */}
        {isMobile && (
          <button className="option-card camera-card" onClick={startCamera}>
            <div className="card-glow" />
            <div className="option-icon-wrapper">
              <div className="option-icon">
                <span className="material-symbols-outlined">photo_camera</span>
              </div>
            </div>
            <h3>Tirar foto</h3>
            <p>Capture uma imagem da folha</p>
            <div className="card-action">
              <span>Usar câmera</span>
              <span className="arrow">→</span>
            </div>
          </button>
        )}

        {/* Coluna central - Galeria */}
        <button
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
              <span className="material-symbols-outlined">photo_library</span>
            </div>
          </div>
          <h3>Abrir galeria</h3>
          <p>Selecione uma imagem salva ou arraste uma foto aqui para analisar.</p>
          <div className="card-action">
            <span>Selecionar imagem</span>
            <span className="arrow">→</span>
          </div>
        </button>

        {/* Coluna direita - Histórico (limitado a 2 itens) */}
        <div className="history-card">
          <div className="history-header">
            <h3 className="history-title">Diagnósticos Recentes</h3>
            {history.length > 2 && (
              <button className="section-link" onClick={() => setShowAllHistory(true)}>
                Ver todos
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
                <p className="empty-title">Nenhum diagnóstico</p>
                <p className="empty-description">Inicie uma análise para ver o histórico.</p>
              </div>
            ) : (
              history.slice(0, 2).map(item => (
                <div key={item.id} className="history-item">
                  <div className="history-icon">
                    <span className="material-symbols-outlined">eco</span>
                  </div>
                  <div className="history-info">
                    <div className="history-name">{formatDiagnosisName(item.disease)}</div>
                    <div className="history-date">{item.date}</div>
                  </div>
                  <div className="history-confidence">
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

      <input type="file" accept="image/*" ref={fileInputRef} className="hidden-input" onChange={handleGalleryImage} />
    </div>
  )
}
