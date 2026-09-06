import ReportButton from "../ReportButton"
import { useMemo, useState } from "react"
import { formatDiagnosisName } from "./diagnosisLabels"
import ThreeDExperience from "./ThreeDExperience"
import "../../../../styles/App/BatchDiagnosis.css"

const IMAGE_STATUS = {
  ok: { label: "Resultado confiável", tone: "success", icon: "check_circle" },
  fora_do_dominio: { label: "Fora do padrão", tone: "warning", icon: "image_not_supported" },
  baixa_qualidade: { label: "Baixa qualidade", tone: "warning", icon: "blur_off" },
  baixa_confianca: { label: "Baixa confiança", tone: "info", icon: "help" },
  classes_proximas: { label: "Classes próximas", tone: "info", icon: "difference" },
  erro_arquivo: { label: "Arquivo inválido", tone: "danger", icon: "broken_image" },
  erro_processamento: { label: "Falha no processamento", tone: "danger", icon: "error" },
  arquivo_vazio: { label: "Arquivo vazio", tone: "danger", icon: "draft" },
  arquivo_muito_grande: { label: "Arquivo muito grande", tone: "danger", icon: "data_usage" },
  tipo_invalido: { label: "Formato inválido", tone: "danger", icon: "file_present" },
  imagem_invalida: { label: "Imagem inválida", tone: "danger", icon: "broken_image" }
}

function asNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function percent(value) {
  return Math.max(0, Math.min(100, Math.round(asNumber(value))))
}

function normalizedKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
}

function isHealthy(value) {
  const key = normalizedKey(value)
  return key.includes("saudavel") || key.includes("healthy")
}

function getConditionStyle(value) {
  const key = normalizedKey(value)
  if (isHealthy(value)) return { tone: "healthy", icon: "verified" }
  if (key.includes("lagarta") || key.includes("largata")) return { tone: "pest", icon: "pest_control" }
  if (key.includes("ferrugem")) return { tone: "rust", icon: "coronavirus" }
  if (key.includes("cercospora")) return { tone: "disease", icon: "microbiology" }
  return { tone: "disease", icon: "eco" }
}

function getImageStatus(status) {
  return IMAGE_STATUS[status] || {
    label: formatDiagnosisName(status || "Inconclusivo"),
    tone: "info",
    icon: "info"
  }
}

function getOverallPresentation(general, conditions) {
  const status = general?.status

  if (status === "heterogeneo") {
    return {
      tone: "heterogeneous",
      icon: "hub",
      eyebrow: "LOTE HETEROGÊNEO",
      title: `${conditions.length || 2} condições detectadas no lote`,
      description: general?.mensagem || "As fotos apresentam mais de uma condição com presença relevante."
    }
  }

  if (status === "consenso_insuficiente") {
    return {
      tone: "warning",
      icon: "rule",
      eyebrow: "RESULTADO INCONCLUSIVO",
      title: "O lote não atingiu consenso suficiente",
      description: general?.mensagem || "As imagens válidas não convergiram para um resultado seguro."
    }
  }

  if (status === "sem_imagens_analisaveis") {
    return {
      tone: "danger",
      icon: "imagesmode",
      eyebrow: "NOVA COLETA NECESSÁRIA",
      title: "Nenhuma foto pôde ser analisada",
      description: general?.mensagem || "Revise a qualidade e o enquadramento das imagens antes de tentar novamente."
    }
  }

  if (status === "erro_api" || status === "erro_conexao") {
    return {
      tone: "danger",
      icon: "cloud_off",
      eyebrow: "ANÁLISE INTERROMPIDA",
      title: "Não foi possível analisar o lote",
      description: general?.mensagem || "Verifique a conexão e tente novamente em alguns instantes."
    }
  }

  if (status === "ok" && isHealthy(general?.condicao_predominante)) {
    return {
      tone: "healthy",
      icon: "verified",
      eyebrow: "CLASSE MAIS PROVÁVEL",
      title: "Lote com predominância saudável",
      description: general?.mensagem || "As imagens confiáveis foram classificadas como soja saudável."
    }
  }

  if (status === "ok" && general?.condicao_predominante) {
    const predominant = general.condicao_predominante
    return {
      tone: "detected",
      icon: getConditionStyle(predominant).icon,
      eyebrow: "CLASSE MAIS PROVÁVEL",
      title: formatDiagnosisName(predominant),
      description: general?.mensagem || "A condição apareceu de forma predominante entre as imagens confiáveis."
    }
  }

  return {
    tone: "neutral",
    icon: "analytics",
    eyebrow: "ANÁLISE CONSOLIDADA",
    title: "Resultado do levantamento",
    description: general?.mensagem || "Confira abaixo o resumo e o resultado individual de cada imagem."
  }
}

function buildPreviewResults(apiResults, selectedImages) {
  const pools = new Map()
  selectedImages.forEach((image) => {
    const key = image.file?.name || ""
    if (!pools.has(key)) pools.set(key, [])
    pools.get(key).push(image)
  })

  return apiResults.map((item, index) => {
    const matchingPool = pools.get(item?.arquivo || "")
    return {
      ...item,
      preview: matchingPool?.shift()?.preview || selectedImages[index]?.preview || null
    }
  })
}

function MetricCard({ icon, value, label, tone = "default" }) {
  return (
    <div className={`batch-metric-card batch-metric-${tone}`}>
      <span className="material-symbols-outlined">{icon}</span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </div>
  )
}

export default function BatchDiagnosisResult({ result, selectedImages = [], onRestart, onCreateInspection, reportContext, allowThreeD = false }) {
  const [imageFilter, setImageFilter] = useState("all")
  const general = result?.resultado_geral || null
  const conditions = useMemo(() => {
    return [...(general?.ocorrencias_confiaveis || [])]
      .filter((item) => item?.classe)
      .sort((a, b) => asNumber(b.imagens_confiaveis) - asNumber(a.imagens_confiaveis))
  }, [general])

  const imageResults = useMemo(
    () => buildPreviewResults(result?.resultados || [], selectedImages),
    [result, selectedImages]
  )

  const filteredImages = imageResults.filter((item) => {
    if (imageFilter === "reliable") return item.status === "ok"
    if (imageFilter === "attention") return item.status !== "ok"
    return true
  })

  const presentation = getOverallPresentation(
    general || { status: result?.status, mensagem: result?.mensagem },
    conditions
  )
  const reliable = asNumber(general?.resultados_confiaveis)
  const rejected = asNumber(general?.inconclusivas_ou_rejeitadas)
  const consensus = percent(general?.consenso)
  const utilization = percent(general?.taxa_aproveitamento)
  const probabilities = Object.entries(general?.probabilidades_medias || {})
    .map(([name, value]) => ({ name, value: asNumber(value) }))
    .sort((a, b) => b.value - a.value)
  const detectedConditionNames = conditions
    .filter((condition) => !isHealthy(condition.classe))
    .map((condition) => formatDiagnosisName(condition.classe))
  const reconstructionImages = useMemo(() => {
    const reliableFileNames = new Set(
      (result?.resultados || [])
        .filter((item) => item?.status === "ok" && item?.arquivo)
        .map((item) => item.arquivo)
    )
    const reliableImages = selectedImages.filter((image) => reliableFileNames.has(image.file?.name))
    return reliableImages.length >= 2 ? reliableImages : selectedImages
  }, [result, selectedImages])

  const nextSteps = general?.status === "heterogeneo"
    ? [
        "Use os cartões por imagem para separar as áreas com cada condição.",
        "Refaça a coleta nas imagens marcadas como inconclusivas ou de baixa qualidade.",
        "Confirme a severidade e o manejo com um engenheiro agrônomo antes de qualquer aplicação."
      ]
    : general?.status === "sem_imagens_analisaveis" || reliable === 0
      ? [
          "Capture fotos mais próximas, nítidas e com iluminação uniforme.",
          "Evite excesso de céu, solo ou objetos sem vegetação no enquadramento.",
          "Envie um lote menor de teste antes de processar toda a missão."
        ]
      : [
          "Priorize a inspeção das imagens com resultado confiável.",
          "Compare o padrão encontrado com outras áreas do mesmo talhão.",
          "Valide a triagem e o manejo com um profissional habilitado."
        ]

  return (
    <div className="batch-result-page">
      <header className={`batch-result-hero batch-result-${presentation.tone}`}>
        <div className="batch-result-hero-copy">
          <div className="batch-result-icon" aria-hidden="true">
            <span className="material-symbols-outlined">{presentation.icon}</span>
          </div>
          <div>
            <span className="batch-eyebrow">{presentation.eyebrow}</span>
            <h1>{presentation.title}</h1>
            <p>{presentation.description}</p>
          </div>
        </div>

        {general && (
          <div className="batch-result-score">
            <div className="batch-score-ring" style={{ "--progress": `${utilization * 3.6}deg` }}>
              <div>
                <strong>{utilization}%</strong>
                <span>aproveitamento</span>
              </div>
            </div>
            <p>{reliable} de {asNumber(general.total_recebidas)} fotos geraram resultado confiável.</p>
          </div>
        )}
      </header>

      {!general ? (
        <section className="batch-error-panel">
          <span className="material-symbols-outlined">wifi_off</span>
          <div>
            <h2>Análise não concluída</h2>
            <p>{result?.mensagem || "Não foi possível se comunicar com a API neste momento."}</p>
          </div>
        </section>
      ) : (
        <>
          <section className="batch-metrics-grid" aria-label="Métricas da análise">
            <MetricCard icon="photo_library" value={asNumber(general.total_recebidas)} label="fotos recebidas" />
            <MetricCard icon="psychology" value={asNumber(general.analisadas_pelo_modelo)} label="analisadas pela IA" />
            <MetricCard icon="verified" value={reliable} label="resultados confiáveis" tone="success" />
            <MetricCard icon="warning" value={rejected} label="precisam de atenção" tone={rejected ? "warning" : "default"} />
            <MetricCard icon="handshake" value={`${consensus}%`} label="consenso do lote" />
            {result?.tempo_processamento_ms != null && <MetricCard icon="timer" value={`${asNumber(result.tempo_processamento_ms).toFixed(0)} ms`} label="tempo de processamento" />}
          </section>



          <div className="batch-result-layout">
            <section className="batch-panel batch-conditions-panel">
              <div className="batch-panel-heading">
                <div>
                  <span className="batch-eyebrow">LEITURA DO LOTE</span>
                  <h2>Classes indicadas pela IA</h2>
                </div>
                <span className="batch-section-count">{conditions.length}</span>
              </div>

              {conditions.length === 0 ? (
                <div className="batch-empty-state">
                  <span className="material-symbols-outlined">query_stats</span>
                  <h3>Sem condição confiável</h3>
                  <p>A IA não encontrou evidência suficiente para consolidar uma classe neste lote.</p>
                </div>
              ) : (
                <div className="batch-condition-list">
                  {conditions.map((condition) => {
                    const style = getConditionStyle(condition.classe)
                    const share = percent(condition.percentual_das_confiaveis)
                    return (
                      <article className={`batch-condition-item batch-condition-${style.tone}`} key={condition.classe}>
                        <div className="batch-condition-icon">
                          <span className="material-symbols-outlined">{style.icon}</span>
                        </div>
                        <div className="batch-condition-main">
                          <div className="batch-condition-title">
                            <strong>{formatDiagnosisName(condition.classe)}</strong>
                            <span>{share}%</span>
                          </div>
                          <div className="batch-condition-bar" aria-label={`${share}% das imagens confiáveis`}>
                            <span style={{ width: `${share}%` }} />
                          </div>
                          <small>
                            {asNumber(condition.imagens_confiaveis)} {asNumber(condition.imagens_confiaveis) === 1 ? "imagem confiável" : "imagens confiáveis"}
                          </small>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="batch-panel batch-probability-panel">
              <div className="batch-panel-heading">
                <div>
                  <span className="batch-eyebrow">VISÃO GERAL</span>
                  <h2>Probabilidade média</h2>
                </div>
                <span className="material-symbols-outlined batch-heading-symbol">donut_large</span>
              </div>
              <div className="batch-probability-list">
                {probabilities.map((item) => (
                  <div className="batch-probability-row" key={item.name}>
                    <div>
                      <span>{formatDiagnosisName(item.name)}</span>
                      <strong>{Math.round(item.value)}%</strong>
                    </div>
                    <div className="batch-probability-track">
                      <span style={{ width: `${percent(item.value)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <aside className="batch-panel batch-guidance-panel">
              <div className="batch-panel-heading">
                <div>
                  <span className="batch-eyebrow">PRÓXIMAS AÇÕES</span>
                  <h2>Como usar o resultado</h2>
                </div>
                <span className="material-symbols-outlined batch-heading-symbol">route</span>
              </div>
              <ol className="batch-guidance-list">
                {nextSteps.map((step, index) => (
                  <li key={step}>
                    <span>{index + 1}</span>
                    <p>{step}</p>
                  </li>
                ))}
              </ol>
            </aside>
          </div>

          <section className="batch-images-section">
            <div className="batch-images-header">
              <div>
                <span className="batch-eyebrow">RASTREABILIDADE</span>
                <h2>Resultado por imagem</h2>
                <p>Veja exatamente qual condição foi associada a cada foto do levantamento.</p>
              </div>
              <div className="batch-filter-group" aria-label="Filtrar imagens">
                <button className={imageFilter === "all" ? "active" : ""} onClick={() => setImageFilter("all")}>
                  Todas <span>{imageResults.length}</span>
                </button>
                <button className={imageFilter === "reliable" ? "active" : ""} onClick={() => setImageFilter("reliable")}>
                  Confiáveis <span>{reliable}</span>
                </button>
                <button className={imageFilter === "attention" ? "active" : ""} onClick={() => setImageFilter("attention")}>
                  Atenção <span>{rejected}</span>
                </button>
              </div>
            </div>

            {filteredImages.length === 0 ? (
              <div className="batch-empty-filter">Nenhuma imagem nesta categoria.</div>
            ) : (
              <div className="batch-image-result-grid">
                {filteredImages.map((item, index) => {
                  const status = getImageStatus(item.status)
                  const conditionStyle = getConditionStyle(item.resultado)
                  const confidence = percent(item.confianca)
                  return (
                    <article className={`batch-image-result-card batch-image-${status.tone}`} key={`${item.arquivo}-${index}`}>
                      <div className="batch-image-result-media">
                        {item.preview ? (
                          <img src={item.preview} alt={`Resultado de ${item.arquivo}`} />
                        ) : (
                          <span className="material-symbols-outlined">image</span>
                        )}
                        <div className={`batch-status-pill batch-status-${status.tone}`}>
                          <span className="material-symbols-outlined">{status.icon}</span>
                          {status.label}
                        </div>
                      </div>
                      <div className="batch-image-result-body">
                        <span className="batch-image-filename" title={item.arquivo}>{item.arquivo || "Imagem sem nome"}</span>
                        {item.status === "ok" ? (
                          <>
                            <span className="batch-image-filename">Classe mais provável</span>
                            <div className={`batch-image-condition batch-condition-${conditionStyle.tone}`}>
                              <span className="material-symbols-outlined">{conditionStyle.icon}</span>
                              <strong>{formatDiagnosisName(item.resultado)}</strong>
                            </div>
                            <div className="batch-image-confidence">
                              <div><span>Confiança do modelo</span><strong>{confidence}%</strong></div>
                              <div className="batch-probability-track"><span style={{ width: `${confidence}%` }} /></div>
                            </div>
                          </>
                        ) : (
                          <div className="batch-image-inconclusive">
                            <strong>{status.label}</strong>
                            <p>{item.mensagem || "Esta foto não entrou no resultado confiável do lote."}</p>
                          </div>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
          {detectedConditionNames.length > 0 && reconstructionImages.length > 0 && (
            <ThreeDExperience images={reconstructionImages} conditionNames={detectedConditionNames} accessAllowed={allowThreeD} />
          )}
        </>
      )}

      <footer className="batch-result-footer">
        <div className="batch-disclaimer">
          <span className="material-symbols-outlined">clinical_notes</span>
          <p>{result?.aviso || "Esta análise funciona como apoio à inspeção e deve ser confirmada em campo. O resultado não substitui avaliação agronômica profissional."}</p>
        </div>
        <div className="batch-result-footer-actions">
          <ReportButton result={result} images={selectedImages} context={reportContext} className="batch-button batch-button-secondary" />
          {onCreateInspection && presentation.tone !== "danger" && (
            <button type="button" className="batch-button batch-button-secondary" onClick={onCreateInspection}>
              <span className="material-symbols-outlined">assignment_add</span>
              Criar tarefa de vistoria
            </button>
          )}
          <button type="button" className="batch-button batch-button-primary" onClick={onRestart}>
            <span className="material-symbols-outlined">refresh</span>
            Nova análise
          </button>
        </div>
      </footer>
    </div>
  )
}
