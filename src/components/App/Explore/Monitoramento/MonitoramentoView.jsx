import { useMemo } from "react"
import { useMonitoramento } from "../hooks/useMonitoramento"
import { interpretar } from "../../utils/Interpretations"
import AlertBanner from "./AlertBanner"
import MetricsPanel from "./MetricsPanel"
import OverlayResult from "./OverlayResult"
import UploadImage from "./UploadImage"
import styles from "../../../../styles/App/MonitoramentoView.module.css"

export default function MonitoramentoView() {
  const { analisar, resetar, result, loading, error, preview } = useMonitoramento()

  const interpretacao = useMemo(() => {
    return result ? interpretar(result) : null
  }, [result])

  const mostrarResultados = result && !loading && !error && interpretacao

  return (
    <div className={styles.container}>
      <div className={styles.cabecalho}>
        <h2 className={styles.titulo}>Monitoramento de Plantacao</h2>
        <p className={styles.subtitulo}>
          Analise visual por imagem aerea ou galeria.
        </p>
      </div>

      <UploadImage
        onSelect={analisar}
        disabled={loading}
      />

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
            <p>Processando imagem com visao computacional...</p>

            <div className={styles.analysisSteps}>
              <div className={styles.analysisStep}>
                <span className="material-symbols-outlined">filter_center_focus</span>
                <span>Pre-processamento</span>
              </div>
              <div className={styles.analysisStep}>
                <span className="material-symbols-outlined">monitoring</span>
                <span>Leitura do talhao</span>
              </div>
              <div className={styles.analysisStep}>
                <span className="material-symbols-outlined">analytics</span>
                <span>Metricas finais</span>
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
            <p className={styles.erroTitulo}>Nao foi possivel analisar</p>
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

          <button
            type="button"
            className={styles.botaoNova}
            onClick={resetar}
          >
            Analisar nova imagem
          </button>
        </div>
      )}
    </div>
  )
}
