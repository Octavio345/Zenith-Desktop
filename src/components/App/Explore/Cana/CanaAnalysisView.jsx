import { useEffect, useMemo, useRef } from "react"
import { useNavigate } from "react-router-dom"
import ReportButton from "../ReportButton"
import { useCanaAnalysis } from "../hooks/useCanaAnalysis"
import { interpretar } from "../../utils/Interpretations"
import AlertBanner from "../Monitoramento/AlertBanner"
import CanaMetricsPanel from "./CanaMetricsPanel"
import CanaOverlayResult from "./CanaOverlayResult"
import UploadImage from "../Monitoramento/UploadImage"
import { validateCanaImage } from "../../../../services/canaAnalysisService"
import { createOccurrenceFromAnalysis, saveActivityDraft } from "../../../../services/fieldOperations"
import styles from "../../../../styles/App/MonitoramentoView.module.css"
import canaStyles from "../../../../styles/App/CanaAnalysisView.module.css"

const STATUS_COPY = {
  connecting: ["Conectando ao Zenith Cana", "Preparando o serviço de visão computacional..."],
  waking: ["Iniciando o serviço", "O ambiente gratuito estava em repouso e está sendo ativado..."],
  uploading: ["Enviando a imagem", "Transferindo a foto para análise..."],
  queued: ["Análise na fila", "Aguardando a vez de processamento no serviço gratuito..."],
  analyzing: ["Reconstruindo o canavial", "Separando vegetação e solo, modelando as fileiras e cruzando interrupções..."],
  finalizing: ["Montando o mapa de campo", "Limpando a camada final e organizando todas as etapas para conferência..."],
}

export default function CanaAnalysisView() {
  const { analyze, reset, result, loading, error, preview, status } = useCanaAnalysis()
  const navigate = useNavigate()
  const interpretation = useMemo(() => result ? interpretar(result) : null, [result])
  const showResults = result && !loading && !error && interpretation
  const statusCopy = STATUS_COPY[status] || STATUS_COPY.connecting
  const statusStage = ["connecting", "waking", "uploading"].includes(status)
    ? 0
    : status === "queued"
      ? 1
      : 2
  const loadingRef = useRef(null)
  const resultRef = useRef(null)
  const showEntry = !showResults && !loading
  const dashboardStats = useMemo(() => {
    if (!result) return []
    const closedCanopy = result.analysis_profile === "dossel_fechado"
    const regionCount = Array.isArray(result.attention_regions)
      ? result.attention_regions.length
      : Number(result.inspection_region_count || 0)
    const rows = Number(result.rows?.row_count || 0)
    const usable = result.analysis_usable === true
    const reliable = result.analysis_reliable === true
    const length = result.possible_gap_length_meters != null
      ? `${result.possible_gap_length_meters} m`
      : result.possible_gap_length_pixels
        ? `${Math.round(result.possible_gap_length_pixels)} px`
        : "—"
    return [
      { icon: reliable || closedCanopy ? "verified" : usable ? "manage_search" : "warning", label: "Qualidade da leitura", value: reliable || closedCanopy ? "Validada" : usable ? "Assistida" : "Inconclusiva", detail: reliable || closedCanopy ? "controles visuais aprovados" : usable ? "confirmar em campo" : "sem evidência suficiente" },
      { icon: closedCanopy ? "grass" : "view_week", label: closedCanopy ? "Cobertura aparente" : "Fileiras reconhecidas", value: closedCanopy && result.coverage != null ? `${Math.round(result.coverage * 100)}%` : usable ? rows : "—", detail: closedCanopy ? "vegetação RGB detectada" : "estrutura reconstruída" },
      { icon: "location_searching", label: "Zonas de vistoria", value: usable || closedCanopy ? regionCount : "—", detail: regionCount ? "priorizadas por evidência" : "nenhuma zona consolidada" },
      { icon: "straighten", label: "Extensão sinalizada", value: usable ? length : "—", detail: result.possible_gap_length_meters != null ? "escala convertida em metros" : "medida visual na imagem" },
    ]
  }, [result])

  useEffect(() => {
    const target = loading ? loadingRef.current : showResults ? resultRef.current : null
    if (!target) return undefined
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    const frame = window.requestAnimationFrame(() => target.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    }))
    return () => window.cancelAnimationFrame(frame)
  }, [loading, showResults])

  const createFieldInspection = () => {
    const occurrence = createOccurrenceFromAnalysis({ result, source: "cana_ia" })
    saveActivityDraft({
      title: "Vistoriar região indicada pela análise da cana",
      description: "Verificar em campo as regiões de atenção apontadas pela análise Zenith Cana antes de qualquer intervenção.",
      type: "tarefa",
      priority: "media",
      source: "cana_ia",
      occurrenceId: occurrence.id,
    })
    navigate("/explore", { state: { activeTab: "atividades" } })
  }

  return (
    <div className={`${styles.container} ${showEntry ? styles.containerUpload : ""} ${canaStyles.canaFlow}`}>
      {showEntry && (
        <section className={canaStyles.entryShell} aria-labelledby="cana-analysis-title">
          <div className={canaStyles.entryIntro}>
            <span className={canaStyles.entryBadge}><i aria-hidden="true" />ZENITH CANA · VISÃO DE CAMPO</span>
            <h2 id="cana-analysis-title">Análise estrutural do canavial</h2>
            <p>Transforme uma imagem aérea em um roteiro visual de conferência das fileiras e possíveis interrupções do estande.</p>
            <div className={canaStyles.entryCapabilities} aria-label="Etapas da análise">
              <div><span className="material-symbols-outlined" aria-hidden="true">contrast</span><strong>Separação visual</strong><small>Vegetação e solo</small></div>
              <div><span className="material-symbols-outlined" aria-hidden="true">view_week</span><strong>Leitura das fileiras</strong><small>Direção e continuidade</small></div>
              <div><span className="material-symbols-outlined" aria-hidden="true">location_searching</span><strong>Mapa de vistoria</strong><small>Pontos para conferir</small></div>
            </div>
            <div className={canaStyles.captureNote}>
              <span className="material-symbols-outlined" aria-hidden="true">photo_camera</span>
              <p><strong>Para uma leitura melhor</strong><small>Use imagem aérea apontada para baixo, com boa nitidez e fileiras visíveis.</small></p>
            </div>
          </div>
          <div className={canaStyles.entryUpload}>
            <header><span>NOVA ANÁLISE</span><strong>Imagem aérea do talhão</strong><small>O arquivo só será enviado quando você confirmar a análise.</small></header>
            <UploadImage onSelect={analyze} disabled={loading} validateFile={validateCanaImage} variant="cana" />
          </div>
        </section>
      )}

      {loading && (
        <section ref={loadingRef} className={canaStyles.loadingShell} aria-live="polite" tabIndex="-1">
          <header className={canaStyles.loadingHeader}>
            <span className={canaStyles.loadingStatusIcon} aria-hidden="true"><span className="material-symbols-outlined">progress_activity</span></span>
            <div><span className={canaStyles.loadingEyebrow}>PROCESSAMENTO EM ANDAMENTO</span><h2>{statusCopy[0]}</h2><p>{statusCopy[1]}</p></div>
          </header>
          <div className={canaStyles.loadingBody}>
            <div className={canaStyles.loadingPreview} aria-hidden="true">
              <div className={canaStyles.loadingPreviewHeader}><span>Imagem recebida</span><small>pré-visualização</small></div>
              <div className={canaStyles.loadingPreviewCanvas}>
                {preview && <img src={preview} alt="" />}
              </div>
              <div className={canaStyles.loadingPreviewFooter}><i /><span>Arquivo recebido e preservado na resolução original</span></div>
            </div>
            <div className={canaStyles.loadingCopy}>
              <span className={canaStyles.loadingStepLabel}>ETAPAS DA ANÁLISE</span>
            <div className={canaStyles.loadingSteps}>
              {["Preparar imagem", "Reconstruir fileiras", "Montar mapa de vistoria"].map((label, index) => (
                <div key={label} className={`${canaStyles.loadingStep} ${statusStage >= index ? canaStyles.loadingStepActive : ""}`}>
                  <span className="material-symbols-outlined">{statusStage > index ? "check" : statusStage === index ? "progress_activity" : "schedule"}</span><strong>{label}</strong><small>{statusStage > index ? "Concluída" : statusStage === index ? "Em andamento" : "Aguardando"}</small>
                </div>
              ))}
            </div>
            <div className={canaStyles.loadingActivity}><i aria-hidden="true" /><span>{statusCopy[1]}</span></div>
              <p className={canaStyles.loadingNote}><span className="material-symbols-outlined" aria-hidden="true">info</span>Se a imagem não tiver evidência visual suficiente, o sistema retornará uma leitura inconclusiva em vez de inventar fileiras.</p>
            </div>
          </div>
        </section>
      )}

      {error && !loading && (
        <div className={styles.erroContainer} role="alert">
          <span className={`material-symbols-outlined ${styles.erroIcone}`} aria-hidden="true">warning</span>
          <div className={styles.erroTextos}>
            <p className={styles.erroTitulo}>Não foi possível analisar</p>
            <p className={styles.erroMensagem}>{error}</p>
          </div>
          <button type="button" className={styles.botaoTentar} onClick={reset}>Tentar novamente</button>
        </div>
      )}

      {showResults && (
        <div ref={resultRef} className={`${styles.resultados} ${canaStyles.resultSection}`} tabIndex="-1">
          <header className={canaStyles.resultHeader}>
            <div><span>ANÁLISE CONCLUÍDA</span><h2>Dashboard de leitura do canavial</h2><p>Visão operacional, evidências visuais e roteiro de vistoria em uma única tela.</p></div>
            <div className={canaStyles.resultHeaderControls}>
              <span className={canaStyles.resultStatus}><i aria-hidden="true" />Processamento finalizado</span>
              <div className={`${styles.acoesResultado} ${canaStyles.resultActions}`} aria-label="Ações do resultado">
                <button type="button" className={`${styles.botaoResultado} ${styles.botaoResultadoPrimario} ${canaStyles.resultActionButton}`} onClick={reset}>
                  <span className="material-symbols-outlined" aria-hidden="true">refresh</span>Nova análise
                </button>
                <div className={`${styles.acaoRelatorio} ${canaStyles.resultReport}`}>
                  <ReportButton kind="cana" result={result} images={[{ preview }]} className={`${styles.botaoResultado} ${styles.botaoResultadoSecundario} ${canaStyles.resultActionButton}`} />
                </div>
                {result.analysis_usable && result.inspection_region_count > 0 && (
                  <button type="button" className={`${styles.botaoResultado} ${styles.botaoResultadoVistoria} ${canaStyles.resultActionButton}`} onClick={createFieldInspection}>
                    <span className="material-symbols-outlined" aria-hidden="true">assignment_add</span>Criar vistoria
                  </button>
                )}
              </div>
            </div>
          </header>
          <AlertBanner alerta={interpretation.alertaPrincipal} />
          <section className={canaStyles.dashboardKpis} aria-label="Resumo da análise">
            {dashboardStats.map((stat) => <article key={stat.label}>
              <span className="material-symbols-outlined" aria-hidden="true">{stat.icon}</span>
              <div><small>{stat.label}</small><strong>{stat.value}</strong><p>{stat.detail}</p></div>
            </article>)}
          </section>
          <div className={canaStyles.dashboardGrid}>
            <div className={styles.colunaImagem}><CanaOverlayResult originalSrc={preview} result={result} /></div>
            <div className={styles.colunaMetricas}><CanaMetricsPanel result={result} insights={interpretation.insights} hideMetrics /></div>
          </div>
        </div>
      )}
    </div>
  )
}
