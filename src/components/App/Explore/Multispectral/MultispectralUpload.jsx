import { useRef, useState } from "react"

const BAND_DEFINITIONS = [
  { id: "green", label: "Banda Verde", shortLabel: "Green", required: true, icon: "filter_vintage" },
  { id: "red", label: "Banda Vermelha", shortLabel: "Red", required: true, icon: "filter_vintage" },
  { id: "redEdge", label: "Red Edge", shortLabel: "Red Edge", required: true, icon: "gradient" },
  { id: "nir", label: "Infravermelho Próximo", shortLabel: "NIR", required: true, icon: "blur_on" },
  { id: "blue", label: "Banda Azul", shortLabel: "Blue", required: false, icon: "filter_vintage" },
  { id: "thermal", label: "Imagem Térmica", shortLabel: "Thermal", required: false, icon: "device_thermostat" },
]

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return ""
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`
}

function BandCard({ band, file, disabled, onSelect, onRemove }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const receiveFiles = (fileList) => {
    setDragging(false)
    const nextFile = Array.from(fileList || [])[0]
    if (nextFile) onSelect(band.id, nextFile)
  }

  return (
    <article
      className={`ms-band-card ms-band-card--${band.id} ${file ? "is-loaded" : ""} ${dragging ? "is-dragging" : ""}`}
      onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => { event.preventDefault(); if (!disabled) receiveFiles(event.dataTransfer.files) }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".tif,.tiff,image/tiff"
        disabled={disabled}
        onChange={(event) => { receiveFiles(event.target.files); event.target.value = "" }}
      />

      <div className="ms-band-card__topline">
        <span className="material-symbols-outlined" aria-hidden="true">{file ? "check_circle" : band.icon}</span>
        <span className={`ms-band-badge ${band.required ? "is-required" : ""}`}>
          {band.required ? "Obrigatória" : "Opcional"}
        </span>
      </div>

      <div className="ms-band-card__copy">
        <h3>{band.label}</h3>
        <p>{band.shortLabel}</p>
      </div>

      {file ? (
        <div className="ms-band-file">
          <div>
            <strong title={file.name}>{file.name}</strong>
            <span>{formatFileSize(file.size)} · arquivo carregado</span>
          </div>
          <button type="button" onClick={() => onRemove(band.id)} disabled={disabled} aria-label={`Remover ${band.label}`}>
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>
      ) : (
        <button type="button" className="ms-band-select" onClick={() => inputRef.current?.click()} disabled={disabled}>
          <span className="material-symbols-outlined" aria-hidden="true">upload_file</span>
          Selecionar TIFF
        </button>
      )}
    </article>
  )
}

export default function MultispectralUpload({ files, error, disabled, onSelect, onRemove, onAnalyze }) {
  const requiredCount = BAND_DEFINITIONS.filter((band) => band.required && files[band.id]).length

  return (
    <section className="ms-upload-panel" aria-labelledby="ms-upload-title">
      <div className="ms-section-heading">
        <div>
          <span className="ms-eyebrow">Preparação das bandas</span>
          <h2 id="ms-upload-title">Adicione as imagens do levantamento</h2>
          <p>Use arquivos TIFF da mesma captura ou produtos já alinhados. As imagens não são processadas no navegador.</p>
        </div>
        <div className="ms-required-progress" aria-label={`${requiredCount} de 4 bandas obrigatórias adicionadas`}>
          <strong>{requiredCount}/4</strong>
          <span>obrigatórias</span>
        </div>
      </div>

      <div className="ms-band-grid">
        {BAND_DEFINITIONS.map((band) => (
          <BandCard
            key={band.id}
            band={band}
            file={files[band.id]}
            disabled={disabled}
            onSelect={onSelect}
            onRemove={onRemove}
          />
        ))}
      </div>

      {error && (
        <div className="ms-message ms-message--error" role="alert">
          <span className="material-symbols-outlined" aria-hidden="true">error</span>
          <p>{error}</p>
        </div>
      )}

      <div className="ms-upload-footer">
        <div className="ms-upload-note">
          <span className="material-symbols-outlined" aria-hidden="true">info</span>
          <p><strong>Antes de analisar:</strong> confirme que todas as bandas representam a mesma área e estão alinhadas.</p>
        </div>
        <button type="button" className="ms-primary-button" onClick={onAnalyze} disabled={disabled}>
          <span className="material-symbols-outlined" aria-hidden="true">analytics</span>
          Analisar levantamento
        </button>
      </div>
    </section>
  )
}

export { BAND_DEFINITIONS }
