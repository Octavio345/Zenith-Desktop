import { useEffect, useMemo, useRef, useState } from "react"
import {
  createModelo3DTask,
  getModelo3DTask,
  getModelo3DViewerUrl
} from "../../../../services/modelo3dApi"
import "../../../../styles/App/ThreeDExperience.css"

const MAX_3D_IMAGES = 40
const POLLING_INTERVAL_MS = 5000
const RETRY_INTERVAL_MS = 10000
const DJI_MODERN_FILE_PATTERN = /^DJI_(\d{8})(\d{6})_(\d{4})_[A-Z]_(\d{6})/i
const DJI_LEGACY_FILE_PATTERN = /^DJI_(\d{4})_(\d{6})/i

function getDronePhotoMetadata(image) {
  const fileName = image?.file?.name || ""
  const modernMatch = fileName.match(DJI_MODERN_FILE_PATTERN)
  if (modernMatch) {
    const [, date, time, flightNumber, sequence] = modernMatch
    return {
      fileName,
      flightKey: `modern_${date}_${time}_${flightNumber}`,
      flightLabel: `${date.slice(6, 8)}/${date.slice(4, 6)}/${date.slice(0, 4)} · ${time.slice(0, 2)}:${time.slice(2, 4)} · voo ${flightNumber}`,
      sequence: Number(sequence),
      sequenceLabel: String(Number(sequence)).padStart(3, "0")
    }
  }

  const legacyMatch = fileName.match(DJI_LEGACY_FILE_PATTERN)
  if (!legacyMatch) return null

  const [, flightNumber, sequence] = legacyMatch
  return {
    fileName,
    flightKey: `legacy_${flightNumber}`,
    flightLabel: `Voo DJI ${flightNumber}`,
    sequence: Number(sequence),
    sequenceLabel: String(Number(sequence)).padStart(3, "0")
  }
}

function buildContinuousSequences(items) {
  const ordered = [...items]
    .filter((item) => item.metadata)
    .sort((a, b) => a.metadata.sequence - b.metadata.sequence)

  return ordered.reduce((sequences, item) => {
    const current = sequences[sequences.length - 1]
    const previous = current?.[current.length - 1]
    if (!previous || item.metadata.sequence > previous.metadata.sequence + 1) sequences.push([item])
    else current.push(item)
    return sequences
  }, [])
}

function groupDroneImages(images) {
  const groups = new Map()

  images.forEach((image) => {
    const metadata = getDronePhotoMetadata(image)
    if (!metadata) return
    if (!groups.has(metadata.flightKey)) {
      groups.set(metadata.flightKey, {
        key: metadata.flightKey,
        label: metadata.flightLabel,
        items: []
      })
    }
    groups.get(metadata.flightKey).items.push({ image, metadata })
  })

  return [...groups.values()]
    .map((group) => ({ ...group, sequences: buildContinuousSequences(group.items) }))
    .sort((a, b) => {
      const longestA = Math.max(0, ...a.sequences.map((sequence) => sequence.length))
      const longestB = Math.max(0, ...b.sequences.map((sequence) => sequence.length))
      return longestB - longestA || b.items.length - a.items.length
    })
}

function getRecommendedPhotoSet(group) {
  const longestSequence = [...(group?.sequences || [])]
    .sort((a, b) => b.length - a.length)[0]
  return (longestSequence || group?.items || []).slice(0, MAX_3D_IMAGES)
}

function getInitialSelection(images) {
  const groups = groupDroneImages(images)
  const recommended = getRecommendedPhotoSet(groups[0])
  const candidates = recommended.length >= 2
    ? recommended.map(({ image }) => image)
    : images.slice(0, MAX_3D_IMAGES)
  return new Set(candidates.map((image) => image.id))
}

function formatSequenceRange(items) {
  const labels = [...items]
    .sort((a, b) => a.metadata.sequence - b.metadata.sequence)
    .map(({ metadata }) => metadata.sequenceLabel)
  if (labels.length === 1) return labels[0]
  return `${labels[0]}–${labels[labels.length - 1]}`
}

function defaultTaskName(conditionNames) {
  const condition = conditionNames[0] || "área monitorada"
  return `Zenith 3D — ${condition}`.slice(0, 120)
}

function taskStatusCopy(status) {
  if (status === "queued") return {
    title: "Preparando a plantação 3D",
    message: "A reconstrução começará assim que o ambiente de processamento estiver disponível."
  }
  if (status === "running") return {
    title: "Reconstruindo a área",
    message: "As imagens estão sendo alinhadas e transformadas em uma malha tridimensional."
  }
  if (status === "completed") return {
    title: "Modelo 3D disponível",
    message: "Gire, aproxime e explore a reconstrução diretamente no Zenith."
  }
  return {
    title: "Carregando plantação 3D",
    message: "Consultando o andamento da reconstrução."
  }
}

export default function ThreeDExperience({ images = [], conditionNames = [] }) {
  const initialSelection = useMemo(
    () => getInitialSelection(images),
    [images]
  )
  const uploadControllerRef = useRef(null)
  const pollingTimerRef = useRef(null)

  const [decision, setDecision] = useState("prompt")
  const [selectedIds, setSelectedIds] = useState(initialSelection)
  const [taskName, setTaskName] = useState(() => defaultTaskName(conditionNames))
  const [qualityConfirmed, setQualityConfirmed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [task, setTask] = useState(null)
  const [error, setError] = useState("")

  const selectedImages = useMemo(
    () => images.filter((image) => selectedIds.has(image.id)),
    [images, selectedIds]
  )
  const flightGroups = useMemo(() => groupDroneImages(images), [images])
  const selectedFlightKeys = useMemo(() => new Set(
    selectedImages
      .map((image) => getDronePhotoMetadata(image)?.flightKey)
      .filter(Boolean)
  ), [selectedImages])
  const hasMixedFlights = selectedFlightKeys.size > 1
  const selectedDroneItems = useMemo(() => selectedImages
    .map((image) => ({ image, metadata: getDronePhotoMetadata(image) }))
    .filter((item) => item.metadata), [selectedImages])
  const hasDiscontinuousSelection = selectedFlightKeys.size === 1
    && selectedDroneItems.length === selectedImages.length
    && buildContinuousSequences(selectedDroneItems).length > 1
  const activeFlight = selectedFlightKeys.size === 1
    ? flightGroups.find((group) => selectedFlightKeys.has(group.key))
    : null
  const recommendedFlightItems = getRecommendedPhotoSet(activeFlight)
  const progress = Math.max(0, Math.min(100, Math.round(Number(task?.progress) || 0)))
  const isCompleted = task?.status === "completed"
  const statusCopy = taskStatusCopy(task?.status)

  useEffect(() => {
    return () => {
      uploadControllerRef.current?.abort()
      if (pollingTimerRef.current) window.clearTimeout(pollingTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!task?.task_id || ["completed", "failed", "canceled"].includes(task.status)) return undefined

    let disposed = false
    const controller = new AbortController()

    const poll = async () => {
      try {
        const latest = await getModelo3DTask(task.task_id, { signal: controller.signal })
        if (disposed) return
        setError("")
        setTask(latest)

        if (!["completed", "failed", "canceled"].includes(latest.status)) {
          pollingTimerRef.current = window.setTimeout(poll, POLLING_INTERVAL_MS)
        }
      } catch (pollError) {
        if (disposed || pollError?.name === "AbortError") return
        setError(`Acompanhamento temporariamente indisponível: ${pollError.message}`)
        pollingTimerRef.current = window.setTimeout(poll, RETRY_INTERVAL_MS)
      }
    }

    pollingTimerRef.current = window.setTimeout(poll, POLLING_INTERVAL_MS)
    return () => {
      disposed = true
      controller.abort()
      if (pollingTimerRef.current) window.clearTimeout(pollingTimerRef.current)
    }
  }, [task?.task_id, task?.status])

  const toggleImage = (imageId) => {
    if (task) return
    setError("")
    setQualityConfirmed(false)
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(imageId)) next.delete(imageId)
      else if (next.size < MAX_3D_IMAGES) next.add(imageId)
      else setError("O limite para uma reconstrução 3D é de 40 fotografias.")
      return next
    })
  }

  const selectPhotoSet = (items) => {
    setSelectedIds(new Set(items.slice(0, MAX_3D_IMAGES).map(({ image }) => image.id)))
    setQualityConfirmed(false)
    setError("")
  }

  const isPhotoSetSelected = (items) => (
    selectedIds.size === items.length
    && items.every(({ image }) => selectedIds.has(image.id))
  )

  const createTask = async () => {
    if (selectedImages.length < 2) {
      setError("Selecione pelo menos 2 fotografias do mesmo voo.")
      return
    }
    if (hasMixedFlights) {
      setError("Foram detectados voos diferentes na seleção. Escolha somente um voo antes de criar o modelo 3D.")
      return
    }
    if (hasDiscontinuousSelection) {
      setError("A seleção contém intervalos sem continuidade. Use um trecho consecutivo para evitar partes soltas ou deformadas no 3D.")
      return
    }
    if (!qualityConfirmed) {
      setError("Confirme que as imagens são originais do mesmo voo antes de consumir créditos.")
      return
    }

    const controller = new AbortController()
    uploadControllerRef.current = controller
    setIsSubmitting(true)
    setError("")

    try {
      const createdTask = await createModelo3DTask(selectedImages, taskName, { signal: controller.signal })
      const taskState = {
        ...createdTask,
        progress: 0,
        status: createdTask.status || "queued"
      }
      setTask(taskState)
      localStorage.setItem("zenith:lastModelo3DTask", createdTask.task_id)
    } catch (submitError) {
      setError(submitError.message || "Não foi possível criar a reconstrução 3D.")
    } finally {
      if (uploadControllerRef.current === controller) uploadControllerRef.current = null
      setIsSubmitting(false)
    }
  }

  if (decision === "dismissed") {
    return (
      <section className="zenith-3d-dismissed">
        <span className="material-symbols-outlined">view_in_ar</span>
        <p>Visualização 3D não iniciada.</p>
        <button type="button" onClick={() => setDecision("configure")}>Preparar 3D</button>
      </section>
    )
  }

  if (decision === "prompt") {
    return (
      <section className="zenith-3d-invitation" aria-labelledby="zenith-3d-question">
        <div className="zenith-3d-visual" aria-hidden="true">
          <div className="zenith-3d-orbit zenith-3d-orbit-one" />
          <div className="zenith-3d-orbit zenith-3d-orbit-two" />
          <span className="material-symbols-outlined">view_in_ar</span>
        </div>
        <div className="zenith-3d-invitation-copy">
          <span className="zenith-3d-eyebrow">RECURSO EXPERIMENTAL</span>
          <h2 id="zenith-3d-question">Reconstrução 3D Experimental</h2>
          <p>
            Reconstrução fotogramétrica experimental a partir de imagens sequenciais do mesmo voo.
            O processamento só começa depois da sua confirmação.
          </p>
          <div className="zenith-3d-quick-warning">
            <span className="material-symbols-outlined">photo_camera</span>
            <span>Use fotos originais do mesmo voo, nítidas e com boa sobreposição.</span>
          </div>
        </div>
        <div className="zenith-3d-invitation-actions">
          <button type="button" className="zenith-3d-primary" onClick={() => setDecision("configure")}>
            <span className="material-symbols-outlined">deployed_code</span>
            Sim, preparar o 3D
          </button>
          <button type="button" className="zenith-3d-secondary" onClick={() => setDecision("dismissed")}>
            Agora não
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="zenith-3d-workspace" aria-labelledby="zenith-3d-title">
      <header className="zenith-3d-workspace-header">
        <div>
          <span className="zenith-3d-eyebrow">ZENITH · FOTOGRAMETRIA</span>
          <h2 id="zenith-3d-title">Reconstrução 3D Experimental</h2>
          <p>Escolha as melhores imagens do mesmo voo. A análise da IA utilizou o lote completo; o 3D aceita até 40 fotos.</p>
        </div>
        {!task && (
          <button type="button" className="zenith-3d-close" onClick={() => setDecision("prompt")} aria-label="Fechar configuração 3D">
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </header>

      {!task ? (
        <>
          <div className="zenith-3d-quality-grid">
            <article>
              <span className="material-symbols-outlined">flight_takeoff</span>
              <strong>Mesmo voo</strong>
              <p>Use uma sequência contínua, com altitude e câmera consistentes.</p>
            </article>
            <article>
              <span className="material-symbols-outlined">filter_center_focus</span>
              <strong>Nitidez real</strong>
              <p>Evite imagens tremidas, escuras, comprimidas ou capturas de tela.</p>
            </article>
            <article>
              <span className="material-symbols-outlined">join_inner</span>
              <strong>Boa sobreposição</strong>
              <p>Mantenha cerca de 70–80% de sobreposição entre fotos consecutivas.</p>
            </article>
          </div>

          <div className="zenith-3d-critical-note" role="note">
            <span className="material-symbols-outlined">warning</span>
            <div>
              <strong>Fotos de folhas isoladas não formam um talhão 3D.</strong>
              <p>Imagens de locais diferentes, sem continuidade visual ou com pouca sobreposição podem consumir créditos e falhar na reconstrução.</p>
            </div>
          </div>

          <div className="zenith-3d-form-row">
            <label>
              <span>Nome da reconstrução</span>
              <input
                value={taskName}
                maxLength={120}
                onChange={(event) => setTaskName(event.target.value)}
                placeholder="Ex.: Talhão norte — voo de agosto"
              />
            </label>
            <div className="zenith-3d-selection-counter">
              <span className="material-symbols-outlined">collections</span>
              <div><strong>{selectedImages.length}/40</strong><small>fotos selecionadas</small></div>
            </div>
          </div>

          {flightGroups.length > 0 && (
            <div className="zenith-3d-flight-panel">
              <div className="zenith-3d-flight-heading">
                <span className="material-symbols-outlined">flight</span>
                <div>
                  <strong>{flightGroups.length === 1 ? "1 voo DJI identificado" : `${flightGroups.length} voos DJI identificados`}</strong>
                  <p>O formato do 3D acompanha a área coberta. Mais fotos podem ampliar o trecho, não apenas aumentar o detalhe.</p>
                </div>
              </div>

              <div className="zenith-3d-flight-list">
                {flightGroups.map((group) => {
                  const recommendedItems = getRecommendedPhotoSet(group)
                  const isActive = isPhotoSetSelected(recommendedItems)
                  return (
                    <button
                      type="button"
                      className={`zenith-3d-flight-option ${isActive ? "selected" : ""}`}
                      key={group.key}
                      onClick={() => selectPhotoSet(recommendedItems)}
                    >
                      <span className="material-symbols-outlined">travel_explore</span>
                      <span>
                        <strong>{group.label}</strong>
                        <small>{group.items.length} foto{group.items.length === 1 ? "" : "s"} no voo · trecho recomendado com {recommendedItems.length}</small>
                      </span>
                      <em>{isActive ? "Selecionado" : "Usar trecho"}</em>
                    </button>
                  )
                })}
              </div>

              {activeFlight?.sequences.length > 1 && (
                <div className="zenith-3d-sequence-picker">
                  <div>
                    <strong>Escolha a cobertura desejada</strong>
                    <p>Use um trecho compacto para reconstruir somente aquela parte da lavoura, ou o voo completo para cobrir uma faixa maior.</p>
                  </div>
                  <div className="zenith-3d-sequence-actions">
                    {recommendedFlightItems.length >= 2 && (
                      <button
                        type="button"
                        className={isPhotoSetSelected(recommendedFlightItems) ? "selected" : ""}
                        onClick={() => selectPhotoSet(recommendedFlightItems)}
                      >
                        Recomendado · {formatSequenceRange(recommendedFlightItems)} · {recommendedFlightItems.length} fotos
                      </button>
                    )}
                    <button
                      type="button"
                      className={isPhotoSetSelected(activeFlight.items) ? "selected" : ""}
                      onClick={() => selectPhotoSet(activeFlight.items)}
                    >
                      Voo completo · {activeFlight.items.length} fotos
                    </button>
                    {activeFlight.sequences
                      .filter((sequence) => sequence.length >= 2)
                      .map((sequence) => {
                        return (
                          <button
                            type="button"
                            className={isPhotoSetSelected(sequence) ? "selected" : ""}
                            key={`${activeFlight.key}-${formatSequenceRange(sequence)}`}
                            onClick={() => selectPhotoSet(sequence)}
                          >
                            Trecho {formatSequenceRange(sequence)} · {sequence.length} fotos
                          </button>
                        )
                      })}
                  </div>
                </div>
              )}

              {hasMixedFlights && (
                <div className="zenith-3d-flight-alert" role="alert">
                  <span className="material-symbols-outlined">wrong_location</span>
                  <span><strong>Voos diferentes estão misturados.</strong> O processamento pode descartar fotos e gerar uma área imprevisível. Selecione um único voo acima.</span>
                </div>
              )}

              {hasDiscontinuousSelection && (
                <div className="zenith-3d-flight-alert" role="alert">
                  <span className="material-symbols-outlined">broken_image</span>
                  <span><strong>Há lacunas entre as fotos escolhidas.</strong> Selecione o trecho recomendado ou somente arquivos consecutivos para manter a malha unida.</span>
                </div>
              )}
            </div>
          )}

          {images.length < 2 ? (
            <div className="zenith-3d-insufficient">
              <span className="material-symbols-outlined">add_photo_alternate</span>
              <div><strong>São necessárias pelo menos 2 fotografias.</strong><p>Faça uma nova análise com imagens sequenciais do voo para liberar a reconstrução.</p></div>
            </div>
          ) : (
            <div className="zenith-3d-photo-grid" aria-label="Selecionar fotografias para o modelo 3D">
              {images.map((image, index) => {
                const selected = selectedIds.has(image.id)
                const metadata = getDronePhotoMetadata(image)
                return (
                  <button
                    type="button"
                    className={`zenith-3d-photo ${selected ? "selected" : ""}`}
                    key={image.id}
                    onClick={() => toggleImage(image.id)}
                    aria-pressed={selected}
                    title={image.file?.name || `Fotografia ${index + 1}`}
                  >
                    <img src={image.preview} alt={`Fotografia ${index + 1} do levantamento`} />
                    <span className="zenith-3d-photo-index">{metadata?.sequenceLabel || String(index + 1).padStart(2, "0")}</span>
                    <span className="zenith-3d-photo-check material-symbols-outlined">{selected ? "check" : "add"}</span>
                  </button>
                )
              })}
            </div>
          )}

          {images.length > MAX_3D_IMAGES && (
            <p className="zenith-3d-limit-note">
              <span className="material-symbols-outlined">info</span>
              A IA analisou {images.length} fotos. Selecione aqui as 40 imagens com melhor continuidade espacial para o 3D.
            </p>
          )}

          <label className="zenith-3d-confirmation">
            <input type="checkbox" checked={qualityConfirmed} onChange={(event) => setQualityConfirmed(event.target.checked)} />
            <span className="zenith-3d-checkbox"><span className="material-symbols-outlined">check</span></span>
            <span>Confirmo que as imagens selecionadas são fotografias originais do mesmo voo e entendo que esta ação pode consumir créditos.</span>
          </label>

          {error && <div className="zenith-3d-error" role="alert"><span className="material-symbols-outlined">error</span>{error}</div>}

          <div className="zenith-3d-submit-row">
            <div>
              <span className="material-symbols-outlined">cloud_upload</span>
              <p><strong>Envio protegido</strong><small>As credenciais de processamento permanecem somente no servidor.</small></p>
            </div>
            <button
              type="button"
              className="zenith-3d-primary zenith-3d-create"
              disabled={isSubmitting || selectedImages.length < 2 || !qualityConfirmed || hasMixedFlights || hasDiscontinuousSelection}
              onClick={createTask}
            >
              <span className={`material-symbols-outlined ${isSubmitting ? "zenith-3d-spin" : ""}`}>
                {isSubmitting ? "progress_activity" : "deployed_code"}
              </span>
              {isSubmitting ? "Enviando imagens…" : "Criar reconstrução 3D"}
            </button>
          </div>
        </>
      ) : (
        <div className="zenith-3d-progress-area">
          <div className="zenith-3d-progress-copy">
            <div className="zenith-3d-progress-icon"><span className="material-symbols-outlined">deployed_code_update</span></div>
            <div>
              <span className="zenith-3d-eyebrow">TAREFA {task.task_id}</span>
              <h3>{statusCopy.title}</h3>
              <p>{statusCopy.message}</p>
            </div>
            <strong>{isCompleted ? "100" : progress}%</strong>
          </div>
          <div className="zenith-3d-progress-track"><span style={{ width: `${isCompleted ? 100 : progress}%` }} /></div>

          {error && <div className="zenith-3d-error" role="alert"><span className="material-symbols-outlined">wifi_off</span>{error}</div>}
          {task.status === "failed" && <div className="zenith-3d-error" role="alert">A reconstrução não pôde ser concluída. Revise a qualidade e a sobreposição das imagens.</div>}
          {task.status === "canceled" && <div className="zenith-3d-error" role="alert">A tarefa foi cancelada antes da conclusão.</div>}

          {isCompleted ? (
            <div className="zenith-3d-viewer-shell">
              <iframe
                src={getModelo3DViewerUrl(task.task_id)}
                title="Visualizador 3D da lavoura"
                allow="fullscreen"
              />
              <a href={getModelo3DViewerUrl(task.task_id)} target="_blank" rel="noreferrer">
                <span className="material-symbols-outlined">open_in_new</span>
                Abrir visualizador em tela cheia
              </a>
            </div>
          ) : (
            <div className="zenith-3d-processing-stage" aria-live="polite">
              <div className="zenith-3d-processing-grid" />
              <span className="material-symbols-outlined">view_in_ar</span>
              <strong>O processamento continua no servidor</strong>
              <p>Você pode permanecer nesta tela; o modelo aparecerá automaticamente quando estiver pronto.</p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
