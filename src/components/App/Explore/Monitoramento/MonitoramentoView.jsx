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
import { resultadoConclusivo } from "../../../../services/monitoramentoService"
import styles from "../../../../styles/App/MonitoramentoView.module.css"

export default function MonitoramentoView() {
  const { analisar, resetar, result, loading, error, preview } = useMonitoramento()
  const monitoringAccess = useFeatureAccess("monitoring")
  const navigate = useNavigate()

  const handleAnalyze = async (file) => {
    await analisar(file, async () => {
      const permission = await monitoringAccess.consume()
      if (!permission.allowed) {
        throw new Error(
          permission.limitReached
            ? "Você já utilizou as três análises disponíveis para este recurso."
            : permission.error?.message || "Não foi possível registrar a análise. Tente novamente."
        )
      }
    })
  }

  const interpretacao = useMemo(() => {
    return result ? interpretar(result) : null
  }, [result])

  const temResposta = Boolean(result && !loading && !error)
  const mostrarInconclusivo = temResposta && !resultadoConclusivo(result)
  const mostrarResultados = temResposta && !mostrarInconclusivo && interpretacao
  const imagemInadequada = result?.is_plantation === false || result?.analysis_status === "inconclusive"

  const createFieldInspection = () => {
    const occurrence = createOccurrenceFromAnalysis({ result, source: "monitoramento" })
    saveActivityDraft({
      title: "Conferir áreas de menor cobertura",
      description: "Conferir em campo as áreas de menor cobertura destacadas na imagem. Considere a cultura e o estágio de desenvolvimento antes de definir qualquer intervenção.",
      type: "tarefa",
      priority: "media",
      source: "monitoramento_aereo",
      occurrenceId: occurrence.id
    })
    navigate("/explore", { state: { activeTab: "atividades" } })
  }

  return (
    <div className={`${styles.container} ${!temResposta ? styles.containerUpload : ""}`}>
      {!temResposta ? (
        <section className={styles.hero} aria-labelledby="monitoramento-title">
          <div className={styles.cabecalho}>
            <h2 id="monitoramento-title" className={styles.titulo}>Monitoramento da plantação</h2>
            <p className={styles.subtitulo}>
              Avalie a cobertura vegetal, a uniformidade e as áreas de menor cobertura na imagem.
            </p>
          </div>
        </section>
      ) : (
        <div className={styles.cabecalho}>
          <h2 className={styles.titulo}>Monitoramento da plantação</h2>
          <p className={styles.subtitulo}>
            Os destaques são indícios visuais. Confirme as áreas de atenção em campo.
          </p>
        </div>
      )}

      <FeatureAccessPanel feature="monitoring" access={{ ...monitoringAccess, refresh: monitoringAccess.refresh }} />

      {!temResposta && (monitoringAccess.fullAccess || monitoringAccess.remaining > 0) && !monitoringAccess.error && (
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

            <h3>Analisando a imagem</h3>
            <p>Estimando cobertura, uniformidade e áreas de atenção...</p>

            <div className={styles.analysisSteps}>
              <div className={styles.analysisStep}>
                <span className="material-symbols-outlined">filter_center_focus</span>
                <span>Preparando imagem</span>
              </div>
              <div className={styles.analysisStep}>
                <span className="material-symbols-outlined">monitoring</span>
                <span>Lendo padrões visuais</span>
              </div>
              <div className={styles.analysisStep}>
                <span className="material-symbols-outlined">analytics</span>
                <span>Organizando resultado</span>
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

      {mostrarInconclusivo && (
        <section className={styles.inconclusiveCard} role="status" aria-labelledby="monitoramento-inconclusivo">
          <div className={styles.inconclusiveText}>
            <span className={`material-symbols-outlined ${styles.inconclusiveIcon}`} aria-hidden="true">info</span>
            <h3 id="monitoramento-inconclusivo">Análise inconclusiva</h3>
            <p>
              {imagemInadequada
                ? "A imagem não oferece evidência visual suficiente para estimar os indicadores com segurança."
                : "O processamento ficou incompleto. Os indicadores parciais não serão apresentados como resultado."}
            </p>
            <p>Escolha uma foto aérea ou elevada, nítida e bem iluminada, da área que deseja avaliar.</p>
            <span className={styles.inconclusiveCredit}>Esta tentativa não descontou uma análise.</span>
            <button type="button" className={`${styles.botaoResultado} ${styles.botaoResultadoPrimario}`} onClick={resetar}>
              <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
              Escolher outra imagem
            </button>
          </div>
          {preview && <img className={styles.inconclusivePreview} src={preview} alt="Imagem enviada para análise" />}
        </section>
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
