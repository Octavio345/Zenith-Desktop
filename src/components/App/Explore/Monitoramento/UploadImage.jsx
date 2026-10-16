import { useEffect, useId, useRef, useState } from "react"
import { arquivoEhAvif, validarArquivo } from "../../../../services/monitoramentoService"
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

export default function UploadImage({ onSelect, disabled, validateFile = validarArquivo, variant = "default" }) {
  const [arrastando, setArrastando] = useState(false)
  const [arquivo, setArquivo] = useState(null)
  const [erroArquivo, setErroArquivo] = useState("")
  const [previewUrl, setPreviewUrl] = useState("")
  const [formatoAvif, setFormatoAvif] = useState(false)
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
    let active = true
    if (!arquivo || variant === "cana") {
      setFormatoAvif(false)
      return undefined
    }
    arquivoEhAvif(arquivo).then((avif) => {
      if (active) setFormatoAvif(avif)
    }).catch(() => {
      if (active) setFormatoAvif(false)
    })
    return () => { active = false }
  }, [arquivo, variant])

  const limparArquivo = () => {
    if (disabled) return
    setArquivo(null)
    setErroArquivo("")
    if (inputRef.current) inputRef.current.value = ""
  }

  const processarArquivo = (file) => {
    if (!file || disabled) return

    const erro = validateFile(file)
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
        variant === "cana" ? styles.uploadAreaCana : "",
        arquivo && variant !== "cana" ? styles.uploadAreaComArquivo : "",
        arrastando ? styles.uploadArea_arrastando : "",
        disabled ? styles.uploadArea_desabilitado : "",
      ].filter(Boolean).join(" ")}
      onDragOver={handleDragOver}
      onDragLeave={() => setArrastando(false)}
      onDrop={handleDrop}
      aria-busy={disabled}
    >
      {!arquivo && (
        <label
          className={styles.uploadDropZone}
          htmlFor={inputId}
          onClick={(event) => disabled && event.preventDefault()}
        >
          <span className={styles.uploadTexto}>
            {variant === "cana" ? "Envie uma imagem da plantação" : "Escolha uma imagem da área cultivada"}
          </span>
          <span className={styles.uploadVisual} aria-hidden="true">
            <UploadGlyph loading={disabled} />
          </span>
          <span className={styles.uploadDropTitle}>
            {arrastando ? "Solte a imagem aqui" : "Arraste ou selecione uma imagem"}
          </span>
          <span className={styles.uploadDica}>
            {variant === "cana"
              ? "JPG, PNG ou WebP, até 30 MB. Prefira uma foto aérea nítida, com boa iluminação."
              : "JPG, PNG, WebP ou AVIF, até 30 MB. Prefira uma vista aérea, nítida e bem iluminada."}
          </span>
        </label>
      )}

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={variant === "cana" ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,image/avif"}
        className={styles.uploadInputOculto}
        disabled={disabled}
        onChange={handleFileChange}
      />

      {arquivo && variant !== "cana" && (
        <div className={styles.uploadSelectedHeader}>
          <div className={styles.uploadSelectedHeading}>
            <span className="material-symbols-outlined" aria-hidden="true">{disabled ? "progress_activity" : "check_circle"}</span>
            <div>
              <strong>{disabled ? "Análise em andamento" : "Imagem pronta para análise"}</strong>
              <span>{disabled ? "Aguarde o processamento da imagem." : "Confira o arquivo antes de continuar."}</span>
            </div>
          </div>
          <button
            type="button"
            className={styles.uploadTrocar}
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            <span className="material-symbols-outlined" aria-hidden="true">upload_file</span>
            Trocar imagem
          </button>
        </div>
      )}

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
              {formatoAvif && variant !== "cana" ? "AVIF · convertido para JPG no envio" : formatarTipo(arquivo)} · {formatarTamanho(arquivo.size)}
              {variant === "cana" && ` · ${disabled ? "Análise em andamento" : "Pronta para análise"}`}
            </span>
          </div>
          {variant === "cana" && (
            <button
              type="button"
              className={styles.uploadFileRemove}
              onClick={limparArquivo}
              disabled={disabled}
              aria-label="Remover imagem selecionada"
            >
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          )}
          {disabled && (
            <div
              className={styles.uploadProgress}
              role="progressbar"
              aria-label="Analisando imagem"
              aria-valuetext="Analisando"
            >
              <span className={styles.uploadProgress_loading} />
            </div>
          )}
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
            {disabled ? "Analisando" : variant === "cana" ? "Analisar plantação" : "Analisar imagem"}
          </button>
        </div>
      )}
    </section>
  )
}
