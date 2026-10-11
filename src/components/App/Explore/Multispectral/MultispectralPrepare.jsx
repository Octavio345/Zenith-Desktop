import { useEffect, useRef, useState } from "react"
import { downloadPreparedBands, prepareMultispectralCapture, validateRawCapture } from "../../../../services/multispectralPreprocessApi"

const STATUS_TEXT = {
  connecting: "Conectando ao serviço",
  waking: "Iniciando o serviço",
  uploading: "Enviando os arquivos",
  queued: "Aguardando processamento",
  processing: "Calibrando e alinhando as bandas",
  finalizing: "Conferindo os resultados",
}

const BAND_LABELS = {
  green: "Verde",
  red: "Vermelha",
  redEdge: "Red Edge",
  nir: "NIR",
  blue: "Azul",
  thermal: "Térmica em °C",
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`
}

function PrepareLoader({ status, onCancel }) {
  const steps = ["Envio", "Processamento", "Verificação"]
  const active = ["connecting", "waking", "uploading", "queued"].includes(status) ? 0 : status === "processing" ? 1 : 2
  return (
    <section className="ms-prep-loader" role="status" aria-live="polite" aria-label="Preparando captura multiespectral">
      <span className="ms-prep-loader__mark" aria-hidden="true"><span /></span>
      <span className="ms-prep-kicker">PREPARAÇÃO EM ANDAMENTO</span>
      <h2>{STATUS_TEXT[status] || status}</h2>
      <p>Estamos preparando os TIFFs da captura para a análise. Mantenha esta página aberta até terminar.</p>
      <div className="ms-prep-loader__track" aria-hidden="true"><span /></div>
      <ol className="ms-prep-loader__steps">
        {steps.map((step, index) => <li key={step} className={index <= active ? "is-active" : ""}><span>{String(index + 1).padStart(2, "0")}</span>{step}</li>)}
      </ol>
      <button type="button" className="ms-prep-text-button" onClick={onCancel}>Cancelar processamento</button>
    </section>
  )
}

export default function MultispectralPrepare({ onUsePrepared, onBusyChange }) {
  const [files, setFiles] = useState([])
  const [error, setError] = useState("")
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState("idle")
  const [transferStatus, setTransferStatus] = useState("")
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)
  const controllerRef = useRef(null)
  const busy = status !== "idle" || Boolean(transferStatus)

  useEffect(() => () => controllerRef.current?.abort(), [])
  useEffect(() => { onBusyChange(busy) }, [busy, onBusyChange])
  useEffect(() => () => onBusyChange(false), [onBusyChange])

  const receiveFiles = (fileList) => {
    const next = Array.from(fileList || [])
    if (!next.length) return
    const merged = [...files]
    for (const file of next) {
      const existing = merged.findIndex((item) => item.name.toLowerCase() === file.name.toLowerCase())
      if (existing >= 0) merged[existing] = file
      else merged.push(file)
    }
    if (merged.length > 8) {
      setError("Selecione no máximo 8 arquivos da mesma captura.")
      return
    }
    if (merged.some((file) => !/\.tiff?$/i.test(file.name))) {
      setError("Use apenas arquivos TIFF (.tif ou .tiff).")
      return
    }
    if (merged.reduce((total, file) => total + file.size, 0) > 1_000_000_000) {
      setError("O conjunto ultrapassa 1 GB. Selecione apenas uma captura.")
      return
    }
    setFiles(merged)
    setResult(null)
    setError("")
  }

  const removeFile = (name) => {
    setFiles((current) => current.filter((file) => file.name !== name))
    setResult(null)
    setError("")
  }

  const prepare = async () => {
    try { validateRawCapture(files) } catch (validationError) { setError(validationError.message); return }
    const controller = new AbortController()
    controllerRef.current = controller
    setStatus("connecting")
    setError("")
    setResult(null)
    try {
      const prepared = await prepareMultispectralCapture(files, { signal: controller.signal, onStatus: setStatus })
      if (!controller.signal.aborted) setResult(prepared)
    } catch (prepareError) {
      if (!controller.signal.aborted) setError(prepareError.message)
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null
        setStatus("idle")
      }
    }
  }

  const usePrepared = async () => {
    if (!result) return
    const controller = new AbortController()
    controllerRef.current = controller
    setError("")
    setTransferStatus("Transferindo as bandas para a análise")
    try {
      const readyFiles = await downloadPreparedBands(result.bands, { signal: controller.signal, onStatus: setTransferStatus })
      if (!controller.signal.aborted) onUsePrepared(readyFiles, result.summary)
    } catch (transferError) {
      if (!controller.signal.aborted) setError(transferError.message)
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null
        setTransferStatus("")
      }
    }
  }

  const cancel = () => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setStatus("idle")
    setTransferStatus("")
    setError("Operação cancelada. Seus arquivos continuam selecionados.")
  }

  if (status !== "idle") return <PrepareLoader status={status} onCancel={cancel} />

  return (
    <section className="ms-prep-panel" aria-labelledby="ms-prep-title">
      <div className="ms-prep-intro">
        <div>
          <span className="ms-prep-kicker">ETAPA OPCIONAL · ALTUM-PT</span>
          <h2 id="ms-prep-title">Prepare uma captura bruta</h2>
          <p>Envie as bandas TIFF originais de uma única captura MicaSense Altum-PT. O serviço prepara os arquivos para a análise multiespectral do Zenith.</p>
        </div>
        <div className="ms-prep-limit"><strong>01</strong><span>captura por vez</span></div>
      </div>

      <div className="ms-prep-flow" aria-label="Etapas do preparo">
        <div><span>01</span><strong>Selecione</strong><small>4 a 8 TIFFs da captura</small></div>
        <div><span>02</span><strong>Processe</strong><small>Calibração e alinhamento</small></div>
        <div><span>03</span><strong>Analise</strong><small>Use as bandas prontas</small></div>
      </div>

      <div
        className={`ms-prep-dropzone ${dragging ? "is-dragging" : ""}`}
        onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); if (!busy) receiveFiles(event.dataTransfer.files) }}
      >
        <input ref={inputRef} type="file" multiple accept=".tif,.tiff,image/tiff" disabled={busy} onChange={(event) => { receiveFiles(event.target.files); event.target.value = "" }} />
        <span className="material-symbols-outlined" aria-hidden="true">upload_file</span>
        <h3>Arquivos da mesma captura</h3>
        <p>Arraste os TIFFs para esta área ou selecione no computador.</p>
        <button type="button" className="ms-secondary-button" onClick={() => inputRef.current?.click()} disabled={busy}>Selecionar arquivos</button>
        <small>Verde, Vermelha, Red Edge e NIR são obrigatórias. Azul e Térmica são opcionais. Até 8 arquivos e 1 GB no total.</small>
      </div>

      {files.length > 0 && (
        <div className="ms-prep-files">
          <div className="ms-prep-files__heading"><strong>Arquivos selecionados</strong><span>{files.length} arquivo{files.length === 1 ? "" : "s"} · {formatSize(files.reduce((sum, file) => sum + file.size, 0))}</span></div>
          <ul>{files.map((file) => <li key={file.name}><span className="material-symbols-outlined" aria-hidden="true">description</span><span title={file.name}>{file.name}</span><small>{formatSize(file.size)}</small><button type="button" onClick={() => removeFile(file.name)} disabled={busy} aria-label={`Remover ${file.name}`}><span className="material-symbols-outlined" aria-hidden="true">close</span></button></li>)}</ul>
        </div>
      )}

      {result && (
        <div className="ms-prep-result" role="status">
          <div className="ms-prep-result__heading"><span className="material-symbols-outlined" aria-hidden="true">check_circle</span><div><span className="ms-prep-kicker">CAPTURA PREPARADA</span><h3>Bandas prontas para análise</h3><p>{result.summary.camera} · {result.summary.valid_optical_overlap_pixels?.toLocaleString("pt-BR") || "—"} pixels ópticos em comum</p></div></div>
          <div className="ms-prep-result__bands">{Object.entries(result.bands).map(([id, band]) => <a key={id} href={band.url} target="_blank" rel="noopener noreferrer" download={band.name}><span>{BAND_LABELS[id]}</span><span className="material-symbols-outlined" aria-hidden="true">download</span></a>)}</div>
          <p className="ms-prep-result__notice">As bandas foram alinhadas para esta captura. Elas não têm georreferenciamento. A temperatura térmica, quando presente, é aparente e deve ser validada em campo.</p>
          {result.summary.warning && <p className="ms-prep-result__warning">{result.summary.warning}</p>}
          <div className="ms-prep-result__actions"><a className="ms-secondary-button" href={result.zipUrl} target="_blank" rel="noopener noreferrer" download="zenith_captura_processada.zip">Baixar pacote ZIP</a><button type="button" className="ms-primary-button" onClick={usePrepared} disabled={busy}>{transferStatus || "Usar na análise"}</button></div>
        </div>
      )}

      {error && <div className="ms-message ms-message--error" role="alert"><span className="material-symbols-outlined" aria-hidden="true">error</span><p>{error}</p></div>}

      {!result && <div className="ms-prep-footer"><p>O preparo usa o mesmo serviço da análise. Capturas grandes podem ultrapassar o tempo disponível no plano gratuito.</p><button type="button" className="ms-primary-button" onClick={prepare} disabled={busy || files.length < 4}>Processar captura</button></div>}
    </section>
  )
}
