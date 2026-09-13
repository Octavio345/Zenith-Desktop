import { useMemo, useState } from "react"
import ReportButton from "../ReportButton"

const MAP_DEFINITIONS = [
  {
    id: "overlay",
    label: "Visão geral",
    title: "Mapa de possíveis alterações fisiológicas",
    description: "As áreas destacadas apresentaram resposta multiespectral diferente do padrão predominante da vegetação.",
  },
  {
    id: "stressScore",
    label: "Resposta espectral",
    title: "Intensidade da diferença espectral",
    description: "O mapa representa a intensidade relativa da diferença identificada pelo modelo dentro da própria cena.",
  },
  {
    id: "ndvi",
    label: "NDVI",
    title: "Índice de vegetação NDVI",
    description: "Visualização da resposta combinada das bandas vermelha e infravermelho próximo sobre a vegetação analisada.",
  },
  {
    id: "ndre",
    label: "NDRE",
    title: "Índice de vegetação NDRE",
    description: "Índice sensível à resposta do Red Edge e NIR, útil para avaliar variações no dossel e na vegetação.",
  },
  {
    id: "priority",
    label: "Prioridade",
    title: "Áreas prioritárias para inspeção",
    description: "Regiões indicadas para direcionar a vistoria em campo; não representam doença confirmada.",
  },
]

const BAND_LABELS = {
  green: "Green",
  red: "Red",
  red_edge: "Red Edge",
  nir: "NIR",
  blue: "Blue",
  thermal: "Thermal",
}

function formatNumber(value, options = {}) {
  const number = Number(value)
  if (!Number.isFinite(number)) return "—"
  return number.toLocaleString("pt-BR", options)
}

function StatBlock({ label, value }) {
  return <div><span>{label}</span><strong>{formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</strong></div>
}

function IndexCard({ label, title, stats }) {
  if (!stats) return null
  return (
    <article className="ms-index-card">
      <div className="ms-index-card__heading"><span>{label}</span><strong>{title}</strong></div>
      <div className="ms-index-card__stats">
        <StatBlock label="Mínimo" value={stats.minimum} />
        <StatBlock label="Máximo" value={stats.maximum} />
        <StatBlock label="Média" value={stats.mean} />
        <StatBlock label="Mediana" value={stats.median} />
      </div>
    </article>
  )
}

export default function MultispectralResults({ result, onRestart }) {
  const [activeMap, setActiveMap] = useState("overlay")
  const { summary, files } = result
  const stress = summary.stress_analysis || {}
  const vegetation = summary.vegetation || {}
  const indices = summary.indices || {}
  const thermal = summary.thermal_analysis || {}
  const input = summary.input || {}
  const processing = summary.processing || {}
  const anomalyPercentage = Number(stress.spectral_anomaly_percentage) || 0
  const priorityPercentage = Number(stress.priority_area_percentage) || 0
  const availableMaps = useMemo(() => MAP_DEFINITIONS.filter((map) => files[map.id]), [files])
  const selectedMap = availableMaps.find((map) => map.id === activeMap) || availableMaps[0]
  const bands = Array.isArray(input.bands_received) ? input.bands_received : []

  return (
    <div className="ms-results">
      <section className="ms-result-hero">
        <div className="ms-result-hero__copy">
          <span className="ms-status-pill"><span className="material-symbols-outlined">check_circle</span> Análise concluída</span>
          <h2>Alteração multiespectral</h2>
          <p>{anomalyPercentage > 0
            ? `${formatNumber(anomalyPercentage, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% da vegetação analisada apresentou resposta multiespectral diferente do padrão da área.`
            : "Não foram identificadas alterações multiespectrais relevantes após a filtragem espacial."}</p>
        </div>

        <div className="ms-result-metrics">
          <article className="ms-main-metric">
            <span>Vegetação com resposta diferente</span>
            <strong>{formatNumber(anomalyPercentage, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<small>%</small></strong>
          </article>
          <article>
            <span>Pixels de vegetação</span>
            <strong>{formatNumber(vegetation.pixel_count)}</strong>
          </article>
          <article>
            <span>Status</span>
            <strong>{anomalyPercentage > 0 ? "Alterações detectadas" : "Sem alteração relevante"}</strong>
          </article>
        </div>
      </section>

      {selectedMap && (
        <section className="ms-map-panel">
          <div className="ms-map-panel__header">
            <div>
              <span className="ms-eyebrow">Visualização do levantamento</span>
              <h3>{selectedMap.title}</h3>
              <p>{selectedMap.description}</p>
            </div>
            <div className="ms-map-tabs" role="tablist" aria-label="Mapas da análise">
              {availableMaps.map((map) => (
                <button
                  key={map.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedMap.id === map.id}
                  className={selectedMap.id === map.id ? "is-active" : ""}
                  onClick={() => setActiveMap(map.id)}
                >{map.label}</button>
              ))}
            </div>
          </div>
          <div className="ms-map-frame">
            <img src={files[selectedMap.id]} alt={selectedMap.title} />
          </div>
          {selectedMap.id === "priority" && (
            <div className="ms-map-caption">
              <span className="material-symbols-outlined">location_searching</span>
              <p><strong>{formatNumber(priorityPercentage, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% da vegetação analisada</strong> integra as áreas prioritárias para inspeção {thermal.available ? "com coincidência espectral e térmica." : "pela análise espectral."}</p>
            </div>
          )}
        </section>
      )}

      <section className="ms-details-grid">
        <div className="ms-indices-panel">
          <div className="ms-section-heading ms-section-heading--compact">
            <div><span className="ms-eyebrow">Índices de vegetação</span><h3>Resumo estatístico</h3></div>
          </div>
          <div className="ms-index-grid">
            <IndexCard label="NDVI" title="Vigor e cobertura" stats={indices.ndvi} />
            <IndexCard label="NDRE" title="Resposta do dossel" stats={indices.ndre} />
            <IndexCard label="GNDVI" title="Resposta à banda verde" stats={indices.gndvi} />
            <IndexCard label="CIre" title="Índice de clorofila Red Edge" stats={indices.cire} />
          </div>
        </div>

        <aside className="ms-side-stack">
          <section className="ms-interpretation-card">
            <span className="material-symbols-outlined" aria-hidden="true">psychology_alt</span>
            <div>
              <h3>Como interpretar</h3>
              <p>As regiões destacadas apresentam comportamento diferente do padrão predominante da vegetação. Isso pode estar associado a fatores fisiológicos, hídricos, nutricionais, fitossanitários ou estruturais. A análise direciona a inspeção em campo e não determina isoladamente a causa do estresse.</p>
            </div>
          </section>

          {thermal.available ? (
            <section className="ms-thermal-card">
              <div className="ms-card-title"><span className="material-symbols-outlined">device_thermostat</span><h3>Análise térmica</h3></div>
              <dl>
                <div><dt>Mediana do dossel</dt><dd>{formatNumber(thermal.canopy_median_celsius, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} °C</dd></div>
                <div><dt>Anomalia térmica</dt><dd>{formatNumber(thermal.hot_anomaly_percentage, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</dd></div>
                <div><dt>Prioridade combinada</dt><dd>{formatNumber(priorityPercentage, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</dd></div>
              </dl>
              <p>A banda térmica é analisada separadamente do NIR e combinada apenas na indicação de prioridade.</p>
            </section>
          ) : (
            <div className="ms-thermal-empty"><span className="material-symbols-outlined">device_thermostat</span><p>{input.thermal_available
              ? "Imagem térmica recebida, mas não houve dados válidos suficientes para calcular anomalias térmicas."
              : "Imagem térmica não fornecida. A prioridade acompanha a análise espectral."}</p></div>
          )}
        </aside>
      </section>

      <details className="ms-technical">
        <summary><span><span className="material-symbols-outlined">tune</span> Informações técnicas</span><span className="material-symbols-outlined ms-chevron">expand_more</span></summary>
        <div className="ms-technical__content">
          <dl>
            <div><dt>Bandas utilizadas</dt><dd>{bands.map((band) => BAND_LABELS[band] || band).join(", ") || "—"}</dd></div>
            <div><dt>Imagem térmica</dt><dd>{input.thermal_available ? "Fornecida" : "Não fornecida"}</dd></div>
            <div><dt>Georreferenciamento</dt><dd>{input.crs ? `Disponível (${input.crs})` : "Não disponível"}</dd></div>
            <div><dt>Dimensões</dt><dd>{input.width && input.height ? `${formatNumber(input.width)} × ${formatNumber(input.height)} px` : "—"}</dd></div>
            <div><dt>Alinhamento assumido</dt><dd>{processing.assume_aligned ? "Sim" : "Não"}</dd></div>
            <div><dt>Escala de reflectância</dt><dd>{formatNumber(input.reflectance_scale)}</dd></div>
          </dl>
          {processing.radiometric_note && <div className="ms-radiometric-note"><span className="material-symbols-outlined">warning</span><p>{processing.radiometric_note}</p></div>}
        </div>
      </details>

      <div className="ms-result-actions">
        <button type="button" className="ms-secondary-button" onClick={onRestart}>
          <span className="material-symbols-outlined">restart_alt</span> Nova análise
        </button>
        <div className="ms-report-action">
          <ReportButton
            kind="multiespectral"
            result={result}
            className="ms-secondary-button"
          />
        </div>
        {files.download && (
          <a className="ms-primary-button" href={files.download} target="_blank" rel="noopener noreferrer" download>
            <span className="material-symbols-outlined">download</span> Baixar resultados
          </a>
        )}
      </div>
    </div>
  )
}
