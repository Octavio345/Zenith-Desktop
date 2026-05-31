import { formatDiagnosisName } from "./diagnosisLabels"

const POSSIBLE_DIAGNOSIS_THRESHOLD = 58

function formatClassName(name) {
  return formatDiagnosisName(name)
}

function normalizeResult(result) {
  const status = result?.status || "ok"
  const probabilities = result?.probabilidades || result?.probabilities || {}
  const probabilityList = Object.entries(probabilities)
    .map(([name, value]) => ({
      name: formatClassName(name),
      value: typeof value === "number" ? value : parseFloat(value) || 0
    }))
    .sort((a, b) => b.value - a.value)

  const rawName =
    result?.resultado ||
    result?.doenca ||
    result?.disease ||
    (probabilityList.length > 0 ? probabilityList[0].name : null) ||
    "Inconclusivo"

  let confidence = result?.confianca || result?.confidence

  if (confidence === undefined || confidence === null) {
    confidence = probabilityList.length > 0 ? probabilityList[0].value : 0
  }

  return {
    status,
    disease: formatClassName(rawName),
    confidence: Math.round(Number(confidence) || 0),
    message: result?.mensagem || result?.message || "",
    quality: result?.qualidade || {},
    probabilityList
  }
}

function getResultMode(status) {
  if (status === "fora_do_dominio") {
    return {
      icon: "warning",
      badge: "Imagem fora do padrão",
      title: "Essa imagem não parece ser soja",
      label: "DIAGNÓSTICO NÃO REALIZADO",
      tone: "warning",
      message: "Por favor, selecione uma foto clara de uma folha ou lavoura de soja."
    }
  }

  if (status === "baixa_qualidade") {
    return {
      icon: "blur_off",
      badge: "Baixa qualidade",
      title: "Imagem sem nitidez suficiente",
      label: "ANÁLISE INCONCLUSIVA",
      tone: "warning",
      message: "Envie uma foto mais próxima, iluminada e focada da folha de soja."
    }
  }

  if (status === "baixa_confianca" || status === "classes_proximas") {
    return {
      icon: "help",
      badge: "Inconclusivo",
      title: "O modelo não teve certeza suficiente",
      label: "ANÁLISE INCONCLUSIVA",
      tone: "info",
      message: "Envie outra imagem da folha em melhor ângulo para confirmar o diagnóstico."
    }
  }

  if (status === "erro_api" || status === "erro_conexao") {
    return {
      icon: "error",
      badge: "Erro na análise",
      title: "Não foi possível analisar a imagem",
      label: "ERRO",
      tone: "danger",
      message: "Tente novamente em alguns instantes."
    }
  }

  return {
    icon: "analytics",
    badge: "Resultado",
    title: "Resultado da análise",
    label: "DOENÇA ENCONTRADA",
    tone: "success",
    message: ""
  }
}

function getRecommendations(diseaseName, status, hasPossibleDiagnosis) {
  if (hasPossibleDiagnosis) {
    return [
      "Use o chute apenas como indicação inicial",
      "Envie uma nova foto mais proxima e bem iluminada para confirmar",
      "Não aplique defensivos sem validação técnica no campo"
    ]
  }

  if (status !== "ok") {
    return [
      "Use uma imagem real de folha ou lavoura de soja",
      "Evite objetos, documentos, canetas, mãos ou fundo sem planta",
      "Fotografe com boa luz e foco antes de analisar novamente"
    ]
  }

  const lowerName = diseaseName.toLowerCase()

  if (lowerName.includes("ferrugem")) {
    return [
      "Aplicar fungicidas específicos com orientação técnica",
      "Monitorar a lavoura a cada 7 dias",
      "Evitar plantio adensado"
    ]
  }

  if (lowerName.includes("cercospora")) {
    return [
      "Consultar um engenheiro agrônomo para confirmar a severidade",
      "Avaliar fungicidas recomendados para a cultura",
      "Reduzir restos culturais quando aplicável"
    ]
  }

  if (lowerName.includes("saudavel") || lowerName.includes("saudável")) {
    return [
      "Manter monitoramento preventivo",
      "Registrar novas imagens em caso de mudança visual",
      "Manter manejo nutricional equilibrado"
    ]
  }

  if (lowerName.includes("lagarta")) {
    return [
      "Avaliar nível de infestação antes de aplicar controle",
      "Usar manejo integrado de pragas",
      "Monitorar talhões vizinhos"
    ]
  }

  return [
    "Consultar um engenheiro agrônomo",
    "Coletar novas imagens da área afetada",
    "Confirmar o diagnóstico antes de qualquer aplicação"
  ]
}

export default function DiagnosisResult({ result, onRestart }) {
  const normalized = normalizeResult(result)
  const mode = getResultMode(normalized.status)
  const isPositiveDiagnosis = normalized.status === "ok"
  const topGuess = normalized.probabilityList[0] || null
  const canShowPossibleDiagnosis =
    !isPositiveDiagnosis &&
    (normalized.status === "baixa_confianca" || normalized.status === "classes_proximas") &&
    topGuess &&
    topGuess.value >= POSSIBLE_DIAGNOSIS_THRESHOLD

  const primaryLabel = isPositiveDiagnosis
    ? mode.label
    : canShowPossibleDiagnosis
      ? "POSSÍVEL DIAGNÓSTICO"
      : mode.label

  const primaryValue = isPositiveDiagnosis
    ? normalized.disease
    : canShowPossibleDiagnosis
      ? topGuess.name
      : mode.badge

  const titleMessage = normalized.message || mode.message
  const primaryMessage = canShowPossibleDiagnosis
    ? `Chute técnico: ${topGuess.name} apareceu com ${Math.round(topGuess.value)}%, mas ainda precisa de uma imagem melhor para confirmar.`
    : titleMessage

  const confidenceLabel = isPositiveDiagnosis
    ? "NÍVEL DE CONFIANÇA"
    : canShowPossibleDiagnosis
      ? "CONFIANÇA DO CHUTE"
      : "STATUS DA ANÁLISE"

  const confidenceValue = isPositiveDiagnosis
    ? `${normalized.confidence}%`
    : canShowPossibleDiagnosis
      ? `${Math.round(topGuess.value)}%`
      : formatClassName(normalized.status)

  const confidenceBarValue = isPositiveDiagnosis
    ? normalized.confidence
    : canShowPossibleDiagnosis
      ? Math.round(topGuess.value)
      : 0

  const shouldShowConfidenceBar = isPositiveDiagnosis || canShowPossibleDiagnosis
  const recommendations = getRecommendations(
    normalized.disease,
    normalized.status,
    canShowPossibleDiagnosis
  )

  return (
    <div className={`result-container animate-fade-in result-${mode.tone}`}>
      <div className="result-title">
        <span className="material-symbols-outlined">{mode.icon}</span>
        <h1>{mode.title}</h1>
      </div>

      <div className="result-grid">
        <div className="col-left">
          <div className="premium-card disease-box">
            <span className="material-symbols-outlined icon-highlight">
              {isPositiveDiagnosis ? "eco" : canShowPossibleDiagnosis ? "tips_and_updates" : mode.icon}
            </span>
            <div className="disease-info">
              <div className="box-label">{primaryLabel}</div>
              <div className="box-value">{primaryValue}</div>
              {!isPositiveDiagnosis && <p className="result-message">{primaryMessage}</p>}
            </div>
          </div>

          <div className="premium-card confidence-box">
            <span className="material-symbols-outlined icon-highlight">
              {isPositiveDiagnosis ? "speed" : canShowPossibleDiagnosis ? "query_stats" : "verified_user"}
            </span>
            <div className="confidence-info">
              <div className="box-label">{confidenceLabel}</div>
              <div className="box-value-wrapper">
                <div className="box-value font-neon">{confidenceValue}</div>
              </div>
              {shouldShowConfidenceBar && (
                <div className="confidence-bar-container">
                  <div className="confidence-fill" style={{ width: `${confidenceBarValue}%` }} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-center">
          <div className="premium-card probability-box">
            <div className="prob-header">
              <span className="material-symbols-outlined">donut_large</span>
              <span>DISTRIBUIÇÃO DE PROBABILIDADE</span>
            </div>
            <div className="probability-list">
              {normalized.probabilityList.length === 0 ? (
                <div className="no-data-wrapper">
                  <span className="material-symbols-outlined no-data-icon">bar_chart_off</span>
                  <div className="no-data">
                    {isPositiveDiagnosis ? "Nenhum dado disponível" : "Probabilidades não exibidas para esta imagem"}
                  </div>
                </div>
              ) : (
                normalized.probabilityList.map((item, idx) => (
                  <div key={idx} className={`prob-item ${idx === 0 && canShowPossibleDiagnosis ? "prob-item-guess" : ""}`}>
                    <div className="prob-name">
                      <span className="material-symbols-outlined">eco</span>
                      <span>{item.name}</span>
                    </div>
                    <div className="prob-bar-wrapper">
                      <div className="prob-bar">
                        <div className="prob-fill" style={{ width: `${item.value}%` }} />
                      </div>
                      <div className="prob-value">{Math.round(item.value)}%</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="col-right">
          <div className="premium-card recommendations-card">
            <div className="rec-header">
              <span className="material-symbols-outlined">help</span>
              <span>O QUE FAZER?</span>
            </div>
            <ul className="rec-list">
              {recommendations.map((rec, idx) => (
                <li key={idx}>
                  <span className="material-symbols-outlined list-check">check_circle</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <button className="restart-btn-premium" onClick={onRestart}>
        <span className="material-symbols-outlined">refresh</span>
        Novo diagnóstico
      </button>

      <style jsx>{`
        .result-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
          background: transparent;
          display: flex;
          flex-direction: column;
          cursor: default;
          user-select: none;
        }

        .result-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          margin-bottom: 2.5rem;
          min-width: 0;
        }

        .result-title span {
          font-size: 2.5rem;
          color: #00ffaa;
          filter: drop-shadow(0 0 8px rgba(0, 255, 170, 0.4));
          flex-shrink: 0;
        }

        .result-warning .result-title span,
        .result-warning .icon-highlight {
          color: #facc15 !important;
        }

        .result-danger .result-title span,
        .result-danger .icon-highlight {
          color: #f87171 !important;
        }

        .result-info .result-title span,
        .result-info .icon-highlight {
          color: #38bdf8 !important;
        }

        .result-title h1 {
          font-size: clamp(1.55rem, 2.2vw, 2.15rem);
          font-weight: 700;
          color: #f0f4f8;
          margin: 0;
          letter-spacing: 0;
          line-height: 1.15;
          text-align: center;
          overflow-wrap: anywhere;
        }

        .result-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 2rem;
          margin-bottom: 3rem;
          width: 100%;
        }

        .premium-card {
          position: relative;
          min-width: 0;
          background: #111720;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 1.75rem;
          transition: all 0.3s ease;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
        }

        .premium-card:hover {
          border-color: rgba(0, 255, 170, 0.3);
          box-shadow: 0 0 0 1px rgba(0, 255, 170, 0.2), 0 0 24px rgba(0, 255, 170, 0.15), 0 8px 40px rgba(0, 0, 0, 0.5);
          transform: translateY(-3px);
        }

        .col-left {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          min-width: 0;
        }

        .col-center,
        .col-right {
          min-width: 0;
        }

        .disease-box,
        .confidence-box {
          display: flex;
          align-items: flex-start;
          gap: 1.25rem;
          flex: 1;
        }

        .icon-highlight {
          font-size: 2.5rem;
          color: #00ffaa !important;
          background: rgba(0, 255, 170, 0.08);
          padding: 0.5rem;
          border-radius: 12px;
          border: 1px solid rgba(0, 255, 170, 0.2);
          flex-shrink: 0;
        }

        .disease-info,
        .confidence-info {
          width: 100%;
          min-width: 0;
        }

        .box-label {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: #788896;
          margin-bottom: 0.5rem;
          overflow-wrap: anywhere;
        }

        .box-value {
          font-size: clamp(1.05rem, 1.35vw, 1.5rem);
          font-weight: 700;
          color: #f0f4f8;
          line-height: 1.18;
          overflow-wrap: anywhere;
          word-break: normal;
          text-transform: none;
        }

        .result-message {
          margin: 0.75rem 0 0;
          color: #a7b4c0;
          line-height: 1.45;
          font-size: clamp(0.84rem, 0.85vw, 0.95rem);
          max-width: 100%;
          overflow-wrap: anywhere;
        }

        .font-neon {
          color: #00ffaa;
          text-shadow: 0 0 10px rgba(0, 255, 170, 0.4);
        }

        .confidence-bar-container {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 999px;
          margin-top: 0.75rem;
          overflow: hidden;
        }

        .confidence-fill {
          height: 100%;
          background: linear-gradient(90deg, #00cc88 0%, #00ffaa 100%);
          border-radius: 999px;
          transition: width 0.6s ease;
        }

        .prob-header,
        .rec-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          min-width: 0;
        }

        .prob-header span:first-child,
        .rec-header span:first-child {
          color: #00ffaa;
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .prob-header span:last-child,
        .rec-header span:last-child {
          min-width: 0;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: #f0f4f8;
          overflow-wrap: anywhere;
        }

        .probability-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .prob-item {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          padding: 0.15rem 0;
          min-width: 0;
        }

        .prob-item-guess {
          padding: 0.65rem;
          margin: -0.2rem -0.65rem 0;
          border-radius: 14px;
          background: rgba(56, 189, 248, 0.08);
          border: 1px solid rgba(56, 189, 248, 0.18);
        }

        .prob-name {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 0;
          font-size: 0.9rem;
          color: #8fa3b8;
        }

        .prob-name span:first-child {
          font-size: 1.1rem;
          color: #00ffaa !important;
          flex-shrink: 0;
        }

        .prob-name span:last-child {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .prob-bar-wrapper {
          display: flex;
          align-items: center;
          gap: 1rem;
          min-width: 0;
        }

        .prob-bar {
          flex: 1;
          min-width: 0;
          height: 6px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 999px;
          overflow: hidden;
        }

        .prob-fill {
          height: 100%;
          background: #00ffaa;
          border-radius: 999px;
          transition: width 0.5s ease;
        }

        .prob-value {
          font-size: 0.85rem;
          font-weight: 600;
          color: #00ffaa !important;
          min-width: 40px;
          text-align: right;
        }

        .no-data-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
          gap: 0.75rem;
        }

        .no-data-icon {
          font-size: 2.5rem;
          color: #56687a;
        }

        .no-data {
          color: #8fa3b8;
          font-size: 0.9rem;
          font-weight: 500;
          text-align: center;
          overflow-wrap: anywhere;
        }

        .rec-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .rec-list li {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          min-width: 0;
          font-size: 0.95rem;
          color: #8fa3b8;
          line-height: 1.4;
        }

        .rec-list li span:last-child {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .list-check {
          color: #00ffaa !important;
          font-size: 1.25rem;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .restart-btn-premium {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          max-width: 320px;
          padding: 1rem 2rem;
          background: #0d7c4b;
          border: none;
          border-radius: 999px;
          font-weight: 700;
          font-size: 1rem;
          color: #ffffff;
          cursor: pointer;
          user-select: none;
          transition: all 0.3s ease;
          align-self: center;
          box-shadow: 0 4px 20px rgba(13, 124, 75, 0.3);
        }

        .restart-btn-premium:hover {
          background: #0e9c5e;
          box-shadow: 0 6px 24px rgba(13, 124, 75, 0.5);
          transform: translateY(-3px);
        }

        .restart-btn-premium span {
          font-size: 1.3rem;
          transition: transform 0.4s ease;
        }

        .restart-btn-premium:hover span {
          transform: rotate(180deg);
        }

        .animate-fade-in {
          animation: fadeInUp 0.5s ease forwards;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 1100px) {
          .result-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .col-left {
            flex-direction: row;
          }

          .disease-box,
          .confidence-box {
            flex: 1;
          }
        }

        @media (max-width: 768px) {
          .result-container {
            padding: 1rem;
          }

          .result-title h1 {
            font-size: 1.8rem;
          }

          .col-left {
            flex-direction: column;
          }

          .premium-card {
            padding: 1.25rem;
          }
        }
      `}</style>
    </div>
  )
}
