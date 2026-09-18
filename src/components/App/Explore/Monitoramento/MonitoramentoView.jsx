import ReportButton from "../ReportButton"
import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useMonitoramento } from "../hooks/useMonitoramento"
import { interpretar } from "../../utils/Interpretations"
import AlertBanner from "./AlertBanner"
import MetricsPanel from "./MetricsPanel"
import OverlayResult from "./OverlayResult"
import UploadImage from "./UploadImage"
import FeatureAccessPanel from "../FeatureAccessPanel"
import { useFeatureAccess } from "../../../../hooks/useFeatureAccess"
import { createOccurrenceFromAnalysis, saveActivityDraft } from "../../../../services/fieldOperations"
import styles from "../../../../styles/App/MonitoramentoView.module.css"

export default function MonitoramentoView() {
  const { analisar, resetar, result, loading, error, preview } = useMonitoramento()
  const monitoringAccess = useFeatureAccess("monitoring")
  const navigate = useNavigate()

  const handleAnalyze = async (file) => {
    const permission = await monitoringAccess.consume()
    if (permission.allowed) await analisar(file)
  }

  const interpretacao = useMemo(() => {
    return result ? interpretar(result) : null
  }, [result])

  const mostrarResultados = result && !loading && !error && interpretacao

  const createFieldInspection = () => {
    const occurrence = createOccurrenceFromAnalysis({ result, source: "monitoramento" })
    saveActivityDraft({
      title: "Vistoriar região de atenção",
      description: "Análise estrutural realizada pelo Zenith. Vistoriar as regiões de atenção indicadas na imagem e confirmar em campo a possível baixa densidade antes de qualquer intervenção.",
      type: "tarefa",
      priority: "media",
      source: "monitoramento_aereo",
      occurrenceId: occurrence.id
    })
    navigate("/explore", { state: { activeTab: "atividades" } })
  }

  return (
    <div className={`${styles.container} ${!mostrarResultados ? styles.containerUpload : ""}`}>
      {!mostrarResultados ? (
        <section className={styles.hero} aria-labelledby="monitoramento-title">
          <div className={styles.cabecalho}>
            <h2 id="monitoramento-title" className={styles.titulo}>Alinhamento da Plantação</h2>
            <p className={styles.subtitulo}>
              Analise o alinhamento e a uniformidade das fileiras
            </p>
          </div>
        </section>
      ) : (
        <div className={styles.cabecalho}>
          <h2 className={styles.titulo}>Monitoramento da plantação</h2>
          <p className={styles.subtitulo}>
            Selecione uma imagem da soja, analise os resultados e confirme em campo.
          </p>
        </div>
      )}

      <FeatureAccessPanel feature="monitoring" access={{ ...monitoringAccess, refresh: monitoringAccess.refresh }} />

      {!mostrarResultados && (monitoringAccess.fullAccess || monitoringAccess.remaining > 0) && !monitoringAccess.error && (
        <UploadImage
          onSelect={handleAnalyze}
          disabled={loading || monitoringAccess.loading}
        />
      )}

      {loading && (
        <div className={styles.analysisContainer} aria-live="polite">
          <div className={styles.analysisContent}>
            <div className={styles.loaderWrapper}>
              <div className={styles.loaderRing}>
                <div className={styles.loaderRingInner} />
              </div>
              <div className={styles.pulseDots} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>

            <h3>Analisando plantio</h3>
            <p>Processando imagem com visão computacional...</p>

            <div className={styles.analysisSteps}>
              <div className={styles.analysisStep}>
                <span className="material-symbols-outlined">filter_center_focus</span>
                <span>Pré-processamento</span>
              </div>
              <div className={styles.analysisStep}>
                <span className="material-symbols-outlined">monitoring</span>
                <span>Leitura da imagem</span>
              </div>
              <div className={styles.analysisStep}>
                <span className="material-symbols-outlined">analytics</span>
                <span>Métricas finais</span>
              </div>
            </div>

            <div className={styles.progressBar} aria-hidden="true">
              <div className={styles.progressFill} />
            </div>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className={styles.erroContainer} role="alert">
          <span
            className={`material-symbols-outlined ${styles.erroIcone}`}
            aria-hidden="true"
          >
            warning
          </span>
          <div className={styles.erroTextos}>
            <p className={styles.erroTitulo}>Não foi possível analisar</p>
            <p className={styles.erroMensagem}>{error}</p>
          </div>
          <button
            type="button"
            className={styles.botaoTentar}
            onClick={resetar}
            aria-label="Limpar erro e tentar novamente"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {mostrarResultados && (
        <div className={styles.resultados}>
          <AlertBanner alerta={interpretacao.alertaPrincipal} />

          <div className={styles.resultadosGrid}>
            <div className={styles.colunaImagem}>
              <OverlayResult originalSrc={preview} result={result} />
            </div>
            <div className={styles.colunaMetricas}>
              <MetricsPanel result={result} insights={interpretacao.insights} />
            </div>
          </div>

          <div className={styles.acoesResultado} aria-label="Ações do resultado">
            <button
              type="button"
              className={`${styles.botaoResultado} ${styles.botaoResultadoPrimario}`}
              onClick={resetar}
            >
              <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
              Analisar nova imagem
            </button>

            <div className={styles.acaoRelatorio}>
              <ReportButton
                kind="monitoramento"
                result={result}
                images={[{ preview }]}
                className={`${styles.botaoResultado} ${styles.botaoResultadoSecundario}`}
              />
            </div>

            <button
              type="button"
              className={`${styles.botaoResultado} ${styles.botaoResultadoVistoria}`}
              onClick={createFieldInspection}
            >
              <span className="material-symbols-outlined" aria-hidden="true">assignment_add</span>
              Criar tarefa de vistoria
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
