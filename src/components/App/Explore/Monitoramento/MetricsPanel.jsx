import { memo } from "react"
import { coresNivelFalha, corPorValor, normalizarNivelFalha } from "../../utils/Interpretations"
import styles from "../../../../styles/App/MonitoramentoView.module.css"

function AnelProgresso({ valor, tamanho = 76, espessura = 6, cor }) {
  const raio = (tamanho - espessura) / 2
  const circunferencia = 2 * Math.PI * raio
  const valorSeguro = Math.min(Math.max(valor, 0), 1)
  const offset = circunferencia * (1 - valorSeguro)

  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox={`0 0 ${tamanho} ${tamanho}`}
      style={{ transform: "rotate(-90deg)" }}
      aria-hidden="true"
    >
      <circle
        cx={tamanho / 2}
        cy={tamanho / 2}
        r={raio}
        fill="none"
        stroke="rgba(15, 26, 19, 0.12)"
        strokeWidth={espessura}
      />
      <circle
        cx={tamanho / 2}
        cy={tamanho / 2}
        r={raio}
        fill="none"
        stroke={cor}
        strokeWidth={espessura}
        strokeDasharray={circunferencia}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{
          transition: "stroke-dashoffset 0.75s cubic-bezier(0.4, 0, 0.2, 1)",
          filter: `drop-shadow(0 0 4px ${cor}88)`,
        }}
      />
    </svg>
  )
}

function CartaoMetrica({ icon, rotulo, children }) {
  return (
    <div className={styles.cartaoMetrica}>
      <div className={styles.cartaoMetricaLabel}>
        {icon && (
          <span className="material-symbols-outlined" aria-hidden="true">
            {icon}
          </span>
        )}
        {rotulo}
      </div>
      <div className={styles.cartaoMetricaConteudo}>{children}</div>
    </div>
  )
}

function MetricsPanel({ result, insights }) {
  if (!result) return null

  const coverage = result.coverage ?? result.density ?? 0
  const uniformity = result.uniformity ?? 0
  const failureScore = result.failure_score ?? 0
  const failureLevel = normalizarNivelFalha(result.failure_level ?? result.failures ?? "BAIXO")
  const rows = result.rows
  const iluminacao = result.illumination_quality ?? "good"
  const sombraPct = Math.round((result.shadow_coverage ?? 0) * 100)
  const pathPct = Math.round((result.path_coverage ?? 0) * 100)

  const coveragePct = Math.round(coverage * 100)
  const uniformityPct = Math.round(uniformity * 100)
  const failurePct = Math.round(failureScore * 100)
  const coresFalha = coresNivelFalha(failureLevel)

  const corCobertura = corPorValor(coverage, { bom: 0.6, aviso: 0.35 })
  const corUniformidade = corPorValor(uniformity, { bom: 0.75, aviso: 0.5 })

  const ROTULOS_ILUMINACAO = {
    good: { texto: "Boa", classe: styles.iluminacao_boa },
    moderate: { texto: "Moderada", classe: styles.iluminacao_moderada },
    poor: { texto: "Ruim", classe: styles.iluminacao_ruim },
  }
  const iluminacaoInfo = ROTULOS_ILUMINACAO[iluminacao] || ROTULOS_ILUMINACAO.good

  return (
    <div className={styles.painelMetricas}>
      <div className={styles.painelCabecalho}>
        <span className="material-symbols-outlined" aria-hidden="true">
          analytics
        </span>
        <span>Analise do talhao</span>
      </div>

      <div className={styles.metriasPrincipais}>
        <div className={styles.metricaAnel}>
          <div className={styles.metricaAnelWrapper}>
            <AnelProgresso valor={coverage} cor={corCobertura} />
            <span className={styles.metricaAnelValor}>{coveragePct}%</span>
          </div>
          <span className={styles.metricaAnelRotulo}>Cobertura</span>
        </div>

        <div className={styles.metricaAnel}>
          <div className={styles.metricaAnelWrapper}>
            <AnelProgresso valor={uniformity} cor={corUniformidade} />
            <span className={styles.metricaAnelValor}>{uniformityPct}%</span>
          </div>
          <span className={styles.metricaAnelRotulo}>Uniformidade</span>
        </div>

        <div className={styles.metricaAnel}>
          <div
            className={styles.badgeFalhas}
            style={{
              background: coresFalha.fundo,
              color: coresFalha.texto,
              borderColor: coresFalha.borda,
            }}
          >
            <span className={styles.badgeFalhasRotulo}>Falhas</span>
            <span className={styles.badgeFalhasNivel}>{failureLevel}</span>
            <span className={styles.badgeFalhasPct}>{failurePct}%</span>
          </div>
          <span className={styles.metricaAnelRotulo}>Plantio</span>
        </div>
      </div>

      <div className={styles.gridDetalhes}>
        <CartaoMetrica icon="view_week" rotulo="Fileiras">
          {rows ? (
            rows.detected ? (
              <div className={styles.fileirasDetalhes}>
                <span className={`${styles.statusTag} ${styles.statusTag_ok}`}>
                  Detectadas
                </span>
                {rows.row_count && (
                  <span className={styles.fileirasDetalheItem}>~{rows.row_count} fileiras</span>
                )}
                {rows.orientation_deg != null && (
                  <span className={styles.fileirasDetalheItem}>
                    {rows.orientation_deg} graus de angulo
                  </span>
                )}
              </div>
            ) : (
              <span className={`${styles.statusTag} ${styles.statusTag_info}`}>
                Nao identificadas
              </span>
            )
          ) : (
            <span
              className={`${styles.statusTag} ${
                result.alignment?.aligned ? styles.statusTag_ok : styles.statusTag_aviso
              }`}
            >
              {result.alignment?.aligned ? "Alinhado" : "Desalinhado"}
            </span>
          )}
        </CartaoMetrica>

        <CartaoMetrica icon="wb_sunny" rotulo="Iluminacao">
          <span className={`${styles.statusTag} ${iluminacaoInfo.classe}`}>
            {iluminacaoInfo.texto}
          </span>
          {sombraPct > 5 && (
            <span className={styles.notaSombra}>{sombraPct}% em sombra</span>
          )}
          {pathPct > 2 && (
            <span className={styles.notaSombra}>{pathPct}% caminhos excluidos</span>
          )}
        </CartaoMetrica>
      </div>

      {insights?.length > 0 && (
        <div className={styles.secaoInterpretacao}>
          <p className={styles.interpretacaoTitulo}>Interpretacao</p>
          <ul className={styles.listaInsights}>
            {insights.map((insight) => (
              <li
                key={insight.texto}
                className={`${styles.itemInsight} ${styles[`itemInsight_${insight.tipo}`]}`}
              >
                <span className={styles.itemInsightPonto} aria-hidden="true" />
                {insight.texto}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default memo(MetricsPanel)
