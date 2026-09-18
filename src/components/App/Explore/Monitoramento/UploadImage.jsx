import { useEffect, useId, useRef, useState } from "react"
import { validarArquivo } from "../../../../services/monitoramentoService"
import styles from "../../../../styles/App/MonitoramentoView.module.css"

function formatarTamanho(bytes) {
  if (!Number.isFinite(bytes)) return ""
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`
}

function formatarTipo(file) {
  const type = file?.type?.split("/")[1]?.toUpperCase()
  return type === "JPEG" ? "JPG" : type || "IMAGEM"
}

function estimarTempoAnalise(bytes) {
  const megabytes = Number(bytes) / (1024 * 1024)
  return Math.min(35, Math.max(8, Math.ceil(megabytes / 2) + 8))
}

function UploadGlyph({ loading = false }) {
  if (loading) {
    return (
      <svg className={`${styles.uploadGlyph} ${styles.uploadGlyph_loading}`} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 12a9 9 0 1 1-6.2-8.56" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg className={styles.uploadGlyph} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 16V4m0 0L7 9m5-5 5 5M5 15v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function UploadImage({ onSelect, disabled }) {
  const [arrastando, setArrastando] = useState(false)
  const [arquivo, setArquivo] = useState(null)
  const [erroArquivo, setErroArquivo] = useState("")
  const [previewUrl, setPreviewUrl] = useState("")
  const [tempoRestante, setTempoRestante] = useState(null)
  const inputRef = useRef(null)
  const inputId = useId()

  useEffect(() => {
    if (!arquivo) {
      setPreviewUrl("")
      return undefined
    }

    const objectUrl = URL.createObjectURL(arquivo)
    setPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [arquivo])

  useEffect(() => {
    if (!disabled || !arquivo) {
      setTempoRestante(null)
      return undefined
    }

    setTempoRestante(estimarTempoAnalise(arquivo.size))
    const timer = window.setInterval(() => {
      setTempoRestante((current) => Math.max(1, (current || 1) - 1))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [arquivo, disabled])

  const limparArquivo = () => {
    if (disabled) return
    setArquivo(null)
    setErroArquivo("")
    if (inputRef.current) inputRef.current.value = ""
  }

  const processarArquivo = (file) => {
    if (!file || disabled) return

    const erro = validarArquivo(file)
    setErroArquivo(erro || "")
    setArquivo(erro ? null : file)
  }

  const handleFileChange = (event) => {
    processarArquivo(event.target.files?.[0])
    event.target.value = ""
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setArrastando(false)
    processarArquivo(event.dataTransfer.files?.[0])
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    if (!disabled) setArrastando(true)
  }

  const enviarArquivo = () => {
    if (arquivo && !disabled) onSelect(arquivo)
  }

  return (
    <section
      className={[
        styles.uploadArea,
        arrastando ? styles.uploadArea_arrastando : "",
        disabled ? styles.uploadArea_desabilitado : "",
      ].filter(Boolean).join(" ")}
      onDragOver={handleDragOver}
      onDragLeave={() => setArrastando(false)}
      onDrop={handleDrop}
      aria-busy={disabled}
    >
      <label
        className={styles.uploadDropZone}
        htmlFor={inputId}
        onClick={(event) => disabled && event.preventDefault()}
      >
        <span className={styles.uploadTexto}>Envie a imagem das fileiras</span>
        <span className={styles.uploadVisual} aria-hidden="true">
          <UploadGlyph loading={disabled} />
        </span>
        <span className={styles.uploadDropTitle}>
          {arrastando ? "Solte a imagem aqui" : "Arraste ou selecione uma imagem"}
        </span>
        <span className={styles.uploadDica}>
          JPG, PNG ou WebP, até 50 MB. Prefira fotos aéreas em alta resolução.
        </span>
      </label>

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className={styles.uploadInputOculto}
        disabled={disabled}
        onChange={handleFileChange}
      />

      {erroArquivo && (
        <p className={styles.uploadFileError} role="alert">{erroArquivo}</p>
      )}

      {arquivo && (
        <div className={styles.uploadFileCard}>
          <div className={styles.uploadFileThumb} aria-hidden="true">
            {previewUrl && <img src={previewUrl} alt="" />}
          </div>
          <div className={styles.uploadFileInfo}>
            <strong title={arquivo.name}>{arquivo.name}</strong>
            <span>
              {formatarTipo(arquivo)} · {formatarTamanho(arquivo.size)} · {disabled
                ? `aprox. ${tempoRestante ?? estimarTempoAnalise(arquivo.size)} s restantes`
                : "Pronta para análise"}
            </span>
          </div>
          <button
            type="button"
            className={styles.uploadFileRemove}
            onClick={limparArquivo}
            disabled={disabled}
            aria-label="Remover imagem selecionada"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
          <div
            className={styles.uploadProgress}
            role="progressbar"
            aria-label={disabled ? "Analisando imagem" : "Imagem pronta para análise"}
            aria-valuetext={disabled ? "Analisando" : "Pronta"}
          >
            <span className={disabled ? styles.uploadProgress_loading : ""} />
          </div>
        </div>
      )}

      {arquivo && (
        <div className={styles.uploadAcoes}>
          <button
            type="button"
            className={styles.uploadCancelar}
            onClick={limparArquivo}
            disabled={disabled}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.uploadAcao}
            onClick={enviarArquivo}
            disabled={disabled}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {disabled ? "progress_activity" : "analytics"}
            </span>
            {disabled ? "Analisando" : "Analisar fileiras"}
          </button>
        </div>
      )}
    </section>
  )
}
