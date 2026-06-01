import { useRef, useState } from "react"
import styles from "../../../../styles/App/MonitoramentoView.module.css"

export default function UploadImage({ onSelect, disabled }) {
  const [arrastando, setArrastando] = useState(false)
  const galleryInputRef = useRef(null)

  const processarArquivo = (file) => {
    if (file && !disabled) onSelect(file)
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

  return (
    <div
      className={[
        styles.uploadArea,
        arrastando ? styles.uploadArea_arrastando : "",
        disabled ? styles.uploadArea_desabilitado : "",
      ].filter(Boolean).join(" ")}
      onDragOver={handleDragOver}
      onDragLeave={() => setArrastando(false)}
      onDrop={handleDrop}
    >
      <div className={styles.uploadVisual} aria-hidden="true">
        <span className="material-symbols-outlined">
          {disabled ? "progress_activity" : "satellite_alt"}
        </span>
      </div>

      <span className={styles.uploadTexto}>
        {disabled ? "Processando imagem..." : "Arraste uma imagem aqui"}
      </span>
      <span className={styles.uploadDica}>
        Ou selecione JPG, PNG ou WebP da galeria.
      </span>

      <div className={styles.uploadAcoes}>
        <button
          type="button"
          className={styles.uploadAcao}
          onClick={() => !disabled && galleryInputRef.current?.click()}
          disabled={disabled}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            photo_library
          </span>
          Selecionar da galeria
        </button>
      </div>

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className={styles.uploadInputOculto}
        disabled={disabled}
        onChange={handleFileChange}
      />
    </div>
  )
}
