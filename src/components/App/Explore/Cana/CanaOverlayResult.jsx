import { useEffect, useMemo, useState } from "react"
import canaStyles from "../../../../styles/App/CanaAnalysisView.module.css"

const STAGE_COPY = {
  original: { index: "01", label: "Imagem", title: "Imagem capturada", description: "A fotografia RGB recebida, sem qualquer marcação.", icon: "photo_camera" },
  mask: { index: "02", label: "Separação", title: "Vegetação e solo", description: "A máscara em preto e branco separa cobertura vegetal de solo ou vazio aparente.", icon: "contrast" },
  rows: { index: "03", label: "Fileiras", title: "Reconstrução das fileiras", description: "O motor recompõe a estrutura periódica do plantio sobre a máscara binária.", icon: "view_week" },
  intersections: { index: "04", label: "Cruzamento", title: "Cruzamento das interrupções", description: "A estrutura das fileiras é cruzada com quedas de cobertura para localizar candidatos reais.", icon: "join_inner" },
  result: { index: "05", label: "Vistoria", title: "Mapa para vistoria", description: "A imagem original retorna com as zonas consolidadas que merecem conferência no talhão.", icon: "location_searching" },
}

function StageLegend({ stageId, closedCanopy, usable }) {
  if (stageId === "original") return <span>Imagem original · nenhum processamento visual aplicado</span>
  if (stageId === "mask") return <><span><i className={canaStyles.legendWhite} />Vegetação detectada</span><span><i className={canaStyles.legendDark} />Solo ou área sem cobertura</span></>
  if (stageId === "rows") return <><span><i className={canaStyles.legendGreen} />Eixo esperado das fileiras</span><span>Camada técnica · não é o mapa final</span></>
  if (stageId === "intersections") return <><span><i className={canaStyles.legendGreen} />Fileira reconstruída</span><span><i className={canaStyles.legendRed} />Interrupção candidata</span></>
  if (!usable) return <span>Sem marcações · a qualidade visual não permitiu uma conclusão segura</span>
  return closedCanopy
    ? <span><i className={canaStyles.legendAmber} />Setor com cobertura abaixo da referência local</span>
    : <span><i className={canaStyles.legendRed} />Zona consolidada para vistoria em campo</span>
}

export default function CanaOverlayResult({ originalSrc, result }) {
  const [activeStageId, setActiveStageId] = useState("result")
  const [playing, setPlaying] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [zoom, setZoom] = useState(1)
  const analysisSrc = result?.analysisSrc || result?.analysisUrl || null
  const closedCanopy = result?.analysis_profile === "dossel_fechado"

  const stages = useMemo(() => [
    { id: "original", src: originalSrc },
    { id: "mask", src: result?.pipelineStages?.mask },
    { id: "rows", src: result?.pipelineStages?.rows },
    { id: "intersections", src: result?.pipelineStages?.intersections },
    { id: "result", src: analysisSrc },
  ].filter((stage) => Boolean(stage.src)).map((stage) => ({ ...STAGE_COPY[stage.id], ...stage })), [analysisSrc, originalSrc, result?.pipelineStages])

  const activeIndex = Math.max(0, stages.findIndex((stage) => stage.id === activeStageId))
  const activeStage = stages[activeIndex] || stages.at(-1)
  const imageAspect = result?.source_dimensions?.width && result?.source_dimensions?.height
    ? `${result.source_dimensions.width} / ${result.source_dimensions.height}`
    : "4 / 3"
  const detectedRows = Number(result?.rows?.row_count || 0)
  const recoveredRows = Number(result?.row_detection_summary?.periodic_recovered_rows || 0)
  const pipelineReady = ["mask", "rows", "intersections"].every((id) => stages.some((stage) => stage.id === id))
  const technicalStage = ["mask", "rows", "intersections"].includes(activeStage?.id)

  useEffect(() => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    setActiveStageId(reduceMotion ? "result" : stages[0]?.id || "result")
    setPlaying(!reduceMotion && stages.length > 1)
  }, [result, stages])

  useEffect(() => {
    if (!playing || !stages.length) return undefined
    if (activeIndex >= stages.length - 1) {
      setPlaying(false)
      return undefined
    }
    const timer = window.setTimeout(() => setActiveStageId(stages[activeIndex + 1].id), 1250)
    return () => window.clearTimeout(timer)
  }, [activeIndex, playing, stages])

  useEffect(() => {
    if (!expanded) return undefined
    const close = (event) => event.key === "Escape" && setExpanded(false)
    document.addEventListener("keydown", close)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", close)
      document.body.style.overflow = ""
    }
  }, [expanded])

  if (!result || !activeStage) return null

  const selectStage = (stageId) => {
    setPlaying(false)
    setActiveStageId(stageId)
    setZoom(1)
  }
  const replay = () => {
    setActiveStageId(stages[0]?.id || "original")
    setPlaying(stages.length > 1)
    setZoom(1)
  }
  const openExpanded = () => {
    setZoom(1)
    setExpanded(true)
  }

  return <>
    <section className={canaStyles.auditViewer} aria-label="Etapas da análise visual da cana">
      <header className={canaStyles.auditHeader}>
        <div className={canaStyles.auditTitleBlock}>
          <span className={canaStyles.auditEyebrow}>ETAPA {activeIndex + 1} DE {stages.length} · PROCESSO AUDITÁVEL</span>
          <strong>{activeStage.title}</strong>
          <small>{activeStage.description}</small>
        </div>
        <div className={canaStyles.auditHeaderActions}>
          <span className={canaStyles.pipelineAvailability}><i aria-hidden="true" />{pipelineReady ? "Fluxo completo" : `${stages.length} etapas disponíveis`}</span>
          <button type="button" className={canaStyles.replayButton} onClick={replay}>
            <span className="material-symbols-outlined" aria-hidden="true">{playing ? "progress_activity" : "play_arrow"}</span>
            {playing ? "Reproduzindo" : "Rever processo"}
          </button>
        </div>
      </header>

      <div className={`${canaStyles.auditViewport} ${technicalStage ? canaStyles.auditViewportTechnical : ""}`} style={{ aspectRatio: imageAspect }}>
        <img key={activeStage.id} src={activeStage.src} alt={activeStage.title} className={canaStyles.auditImage} loading="lazy" />
        <div className={canaStyles.stageBadge}><span>{activeStage.index}</span><i className="material-symbols-outlined" aria-hidden="true">{activeStage.icon}</i>{activeStage.label}</div>
        <button type="button" className={canaStyles.expandImageButton} onClick={openExpanded} aria-label="Abrir etapa em resolução integral">
          <span className="material-symbols-outlined" aria-hidden="true">zoom_out_map</span><span>Resolução integral</span>
        </button>
      </div>

      <nav className={canaStyles.stageRail} aria-label="Selecionar etapa da análise">
        {stages.map((stage, index) => <button
          key={stage.id}
          type="button"
          className={`${canaStyles.stageButton} ${stage.id === activeStage.id ? canaStyles.stageButtonActive : ""} ${index < activeIndex ? canaStyles.stageButtonDone : ""}`}
          onClick={() => selectStage(stage.id)}
          aria-current={stage.id === activeStage.id ? "step" : undefined}
        >
          <span className={canaStyles.stageIndex}>{stage.index}</span>
          <span className={`material-symbols-outlined ${canaStyles.stageIcon}`} aria-hidden="true">{stage.icon}</span>
          <span className={canaStyles.stageButtonCopy}><strong>{stage.label}</strong><small>{stage.title}</small></span>
        </button>)}
      </nav>

      <footer className={canaStyles.stageLegend}>
        <div className={canaStyles.stageLegendItems}><StageLegend stageId={activeStage.id} closedCanopy={closedCanopy} usable={result.analysis_usable} /></div>
        <span className={canaStyles.stagePurpose}><span className="material-symbols-outlined" aria-hidden="true">info</span>{technicalStage ? "Camada técnica de conferência" : "Imagem operacional"}</span>
      </footer>
    </section>

    <section className={canaStyles.pipelineSummary} aria-label="Resumo técnico da leitura">
      <div className={canaStyles.pipelineSummaryIntro}>
        <span className="material-symbols-outlined" aria-hidden="true">verified_user</span>
        <div><span>RASTREABILIDADE VISUAL</span><strong>Do pixel ao ponto de vistoria</strong><small>Cada marcação final pode ser conferida nas etapas anteriores, sem esconder o raciocínio visual.</small></div>
      </div>
      <div className={canaStyles.pipelineFacts}>
        <div><strong>{closedCanopy ? result.inspection_region_count : detectedRows || "—"}</strong><span>{closedCanopy ? "setores comparados" : "fileiras reconstruídas"}</span></div>
        <div><strong>{closedCanopy ? "Relativa" : recoveredRows}</strong><span>{closedCanopy ? "referência interna" : "linhas recuperadas"}</span></div>
        <div><strong>{result.source_dimensions?.width || "—"} × {result.source_dimensions?.height || "—"}</strong><span>pixels preservados</span></div>
        <div><strong>{result.analysis_revision === "semantic_gap_rendering_v9_6" ? "v9.6" : result.analysis_revision === "cross_row_voids_v9_5" ? "v9.5" : result.analysis_revision === "complete_grid_conservative_gaps_v9_4" ? "v9.4" : result.analysis_revision === "multiscale_row_semantics_v9_3" ? "v9.3" : result._apiVersion?.endsWith("v9") ? "v9" : result._apiVersion?.endsWith("v8") ? "v8" : "compatível"}</strong><span>motor de análise</span></div>
      </div>
    </section>

    {expanded && <div className={canaStyles.imageLightbox} role="dialog" aria-modal="true" aria-label={`${activeStage.title} em resolução integral`} onMouseDown={(event) => event.target === event.currentTarget && setExpanded(false)}>
      <header className={canaStyles.imageLightboxToolbar}>
        <div><span className={canaStyles.viewerEyebrow}>ZENITH CANA · ETAPA {activeIndex + 1}/{stages.length}</span><strong>{activeStage.title}</strong><small>{activeStage.description}</small></div>
        <div>
          <a href={activeStage.src} download={`zenith-cana-${activeStage.id}.png`}><span className="material-symbols-outlined" aria-hidden="true">download</span>Baixar etapa</a>
          <button type="button" className={canaStyles.backToAnalysis} onClick={() => setExpanded(false)}><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>Voltar à análise</button>
        </div>
      </header>
      <div className={canaStyles.imageLightboxBody}>
        <aside className={canaStyles.viewerStageRail} aria-label="Etapas disponíveis">
          <div className={canaStyles.viewerStageRailTitle}><span>FLUXO DA ANÁLISE</span><strong>Etapas auditáveis</strong></div>
          {stages.map((stage) => <button key={stage.id} type="button" className={stage.id === activeStage.id ? canaStyles.viewerStageActive : ""} onClick={() => selectStage(stage.id)}>
            <span>{stage.index}</span>
            <i className="material-symbols-outlined" aria-hidden="true">{stage.icon}</i>
            <span><strong>{stage.label}</strong><small>{stage.title}</small></span>
          </button>)}
          <p><span className="material-symbols-outlined" aria-hidden="true">verified_user</span>As camadas técnicas preservam a resolução recebida e permitem conferir a origem de cada indicação.</p>
        </aside>
        <div className={`${canaStyles.imageLightboxCanvas} ${technicalStage ? canaStyles.imageLightboxCanvasTechnical : ""}`}>
          <div className={canaStyles.viewerImageStage}><img src={activeStage.src} alt={activeStage.title} style={{ transform: `scale(${zoom})` }} /></div>
          <div className={canaStyles.viewerDock} aria-label="Controles de ampliação">
            <button type="button" onClick={() => setZoom((value) => Math.max(.6, Number((value - .2).toFixed(1))))} aria-label="Diminuir zoom"><span className="material-symbols-outlined">remove</span></button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((value) => Math.min(3, Number((value + .2).toFixed(1))))} aria-label="Aumentar zoom"><span className="material-symbols-outlined">add</span></button>
            <i />
            <button type="button" className={canaStyles.fitButton} onClick={() => setZoom(1)}><span className="material-symbols-outlined">fit_screen</span>Ajustar</button>
          </div>
        </div>
      </div>
    </div>}
  </>
}
