import { useMemo } from "react"
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
    <div className={`${styles.container} ${!showResults ? styles.containerUpload : ""}`}>
      {!showResults ? (
        <section className={styles.hero} aria-labelledby="cana-analysis-title">
          <div className={styles.cabecalho}>
            <span className={styles.serviceBadge}>
              <span aria-hidden="true" />
              Visão computacional · Zenith Cana
            </span>
            <h2 id="cana-analysis-title" className={styles.titulo}>Análise da Cana-de-Açúcar</h2>
            <p className={styles.subtitulo}>
              Audite fileiras em cana jovem e localize manchas de cobertura quando o dossel já estiver fechado
            </p>
          </div>
        </section>
      ) : (
        <div className={styles.cabecalho}>
          <h2 className={styles.titulo}>Resultado da análise da cana</h2>
          <p className={styles.subtitulo}>Percorra cada etapa da leitura e confira como o mapa de campo foi construído.</p>
        </div>
      )}

      {!showResults && (
        <UploadImage onSelect={analyze} disabled={loading} validateFile={validateCanaImage} />
      )}

      {loading && (
        <div className={canaStyles.loadingShell} aria-live="polite">
          <div className={canaStyles.loadingVisual} aria-hidden="true">
            <div className={canaStyles.fieldRows}>
              <span /><span /><span /><span /><span /><span />
            </div>
            <div className={canaStyles.drone}><span className="material-symbols-outlined">flight</span></div>
            <div className={canaStyles.scanBeam} />
          </div>
          <div className={canaStyles.loadingCopy}>
            <span className={canaStyles.loadingEyebrow}>ZENITH CANA · TRIAGEM DE ESTANDE</span>
            <h3>{statusCopy[0]}</h3>
            <p>{statusCopy[1]}</p>
            <div className={canaStyles.loadingSteps}>
              {["Receber imagem", "Reconstruir fileiras", "Montar vistoria"].map((label, index) => (
                <div key={label} className={`${canaStyles.loadingStep} ${statusStage >= index ? canaStyles.loadingStepActive : ""}`}>
                  <span>{statusStage > index ? "check" : index + 1}</span>{label}
                </div>
              ))}
            </div>
            <div className={canaStyles.loadingProgress} aria-hidden="true"><span /></div>
            <small>O sistema pode recusar a medição quando a imagem não mostrar fileiras com clareza.</small>
          </div>
        </div>
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
        <div className={styles.resultados}>
          <AlertBanner alerta={interpretation.alertaPrincipal} />
          <div className={styles.resultadosGrid}>
            <div className={styles.colunaImagem}><CanaOverlayResult originalSrc={preview} result={result} /></div>
            <div className={styles.colunaMetricas}><CanaMetricsPanel result={result} insights={interpretation.insights} /></div>
          </div>
          <div className={`${styles.acoesResultado} ${(!result.analysis_usable || result.inspection_region_count <= 0) ? canaStyles.twoActions : ""}`} aria-label="Ações do resultado">
            <button type="button" className={`${styles.botaoResultado} ${styles.botaoResultadoPrimario}`} onClick={reset}>
              <span className="material-symbols-outlined" aria-hidden="true">refresh</span>Analisar nova imagem
            </button>
            <div className={styles.acaoRelatorio}>
              <ReportButton kind="cana" result={result} images={[{ preview }]} className={`${styles.botaoResultado} ${styles.botaoResultadoSecundario}`} />
            </div>
            {result.analysis_usable && result.inspection_region_count > 0 && (
              <button type="button" className={`${styles.botaoResultado} ${styles.botaoResultadoVistoria}`} onClick={createFieldInspection}>
                <span className="material-symbols-outlined" aria-hidden="true">assignment_add</span>Criar tarefa de vistoria
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
