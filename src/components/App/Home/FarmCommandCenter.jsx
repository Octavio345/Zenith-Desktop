import { useEffect, useMemo, useState } from "react"
import { getFieldOccurrences } from "../../../services/fieldOperations"

const FARM_POLYGONS_KEY = "farmPolygons"

function safeJson(key, fallback) {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

function formatCondition(value) {
  return String(value || "Ocorrência")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function relativeDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Agora"
  const diff = Math.max(0, Date.now() - date.getTime())
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return "Agora"
  if (hours < 24) return `${hours}h atrás`
  return `${Math.floor(hours / 24)}d atrás`
}

export default function FarmCommandCenter({ activities = [], onOpen }) {
  const [occurrences, setOccurrences] = useState([])
  const [fieldAreas, setFieldAreas] = useState([])

  useEffect(() => {
    const sync = () => {
      setOccurrences(getFieldOccurrences())
      const areas = safeJson(FARM_POLYGONS_KEY, [])
      setFieldAreas(Array.isArray(areas) ? areas : [])
    }
    sync()
    window.addEventListener("focus", sync)
    window.addEventListener("storage", sync)
    window.addEventListener("zenith:field-occurrences-updated", sync)
    return () => {
      window.removeEventListener("focus", sync)
      window.removeEventListener("storage", sync)
      window.removeEventListener("zenith:field-occurrences-updated", sync)
    }
  }, [])

  const pending = useMemo(
    () => activities.filter((activity) => ["pendente", "em_andamento"].includes(activity.status)).length,
    [activities]
  )
  const highPriority = useMemo(
    () => activities.filter((activity) => activity.priority === "alta" && activity.status !== "concluida").length,
    [activities]
  )
  const mappedAreaIds = useMemo(
    () => new Set(fieldAreas.map((area) => String(area.id))),
    [fieldAreas]
  )
  const attentionOccurrences = occurrences.filter((item) => (
    item.status === "aguarda_vistoria" &&
    item.fieldAreaId &&
    mappedAreaIds.has(String(item.fieldAreaId))
  ))

  return (
    <section className="farm-command-center" aria-label="Central operacional da fazenda">
      <header className="farm-command-center__head">
        <div>
          <span className="zenith-kicker"><span className="material-symbols-outlined">radar</span> Central da fazenda</span>
          <h2>O que precisa de atenção</h2>
          <p>Acompanhe vistorias pendentes e atividades da propriedade.</p>
        </div>
        <button type="button" onClick={() => onOpen("mapa")}>
          Ver mapa e talhões <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </header>

      <div className="farm-command-center__metrics">
        <article><span className="material-symbols-outlined">grid_view</span><small>Talhões mapeados</small><strong>{fieldAreas.length}</strong></article>
        <article className={attentionOccurrences.length ? "is-alert" : ""}><span className="material-symbols-outlined">visibility</span><small>Vistorias pendentes</small><strong>{attentionOccurrences.length}</strong></article>
        <article><span className="material-symbols-outlined">assignment_late</span><small>Atividades abertas</small><strong>{pending}</strong></article>
        <article className={highPriority ? "is-alert" : ""}><span className="material-symbols-outlined">priority_high</span><small>Prioridade alta</small><strong>{highPriority}</strong></article>
      </div>

      <div className="farm-command-center__body">
        <article className="farm-command-center__timeline">
          <div className="farm-command-center__section-title"><span className="material-symbols-outlined">timeline</span><div><small>Acompanhamento</small><h3>Sinais para verificar em campo</h3></div></div>
          {attentionOccurrences.length ? attentionOccurrences.slice(0, 3).map((item) => (
            <button className="operation-event" type="button" key={item.id} onClick={() => onOpen("atividades")}>
              <span className="operation-event__icon material-symbols-outlined">{item.source === "monitoramento" ? "satellite_alt" : "biotech"}</span>
              <span><strong>{formatCondition(item.condition)}</strong><small>{item.fieldAreaName} · {item.confidence}% de confiança · {relativeDate(item.createdAt)}</small></span>
              <span className="operation-event__state">Vistoriar</span>
            </button>
          )) : (
            <div className="farm-command-center__empty"><span className="material-symbols-outlined">verified</span><p>Nenhuma ocorrência aguardando vistoria. Faça uma análise para iniciar o acompanhamento.</p></div>
          )}
        </article>

        <article className="farm-command-center__next-step">
          <span className="material-symbols-outlined">route</span>
          <small>Próximo passo recomendado</small>
          <h3>{attentionOccurrences.length ? "Confira as vistorias pendentes" : "Comece por uma imagem"}</h3>
          <p>{attentionOccurrences.length ? "Converta a ocorrência identificada pela análise em uma tarefa para a equipe." : "Selecione imagens da soja para analisar sinais e acompanhar a lavoura."}</p>
          <button type="button" onClick={() => onOpen(attentionOccurrences.length ? "atividades" : "diagnostico")}>
            {attentionOccurrences.length ? "Ver atividades" : "Fazer análise"}<span className="material-symbols-outlined">arrow_outward</span>
          </button>
        </article>
      </div>
    </section>
  )
}
