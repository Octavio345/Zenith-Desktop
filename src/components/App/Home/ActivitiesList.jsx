import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

function formatDiagnosisName(value) {
  if (!value) return "Diagnóstico"
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, letter => letter.toUpperCase())
}

export default function ActivitiesList({ hasFarm, onViewAll, onRegister }) {
  const navigate = useNavigate()
  const [recentDiagnostics, setRecentDiagnostics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem("diagnosticHistory")
        const history = saved ? JSON.parse(saved) : []
        setRecentDiagnostics(Array.isArray(history) ? history.slice(0, 3) : [])
        setError(null)
      } catch {
        setError("Erro ao carregar atividades.")
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [])

  if (!hasFarm) {
    return (
      <div className="act-empty">
        <span className="material-symbols-outlined act-empty-icon">inbox</span>
        <h3>Nenhuma atividade registrada</h3>
        <p>Cadastre uma fazenda para começar a monitorar suas atividades.</p>
        <button className="act-empty-btn" onClick={onRegister}>
          <span className="material-symbols-outlined">add</span>
          Cadastrar Fazenda
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="act-loading">
        <div className="act-spinner"></div>
        <p>Carregando atividades...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="act-error">
        <span className="material-symbols-outlined">error</span>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Tentar novamente</button>
      </div>
    )
  }

  const activities = [
    {
      id: 1,
      type: "diagnostic",
      icon: "assignment",
      title: "Tarefas do campo",
      description: "Acompanhe responsáveis, prazos e operações da fazenda",
      status: "pendente",
      action: () => navigate("/explore", { state: { activeTab: "atividades" } })
    },
    {
      id: 2,
      type: "history",
      icon: "history",
      title: "Diagnósticos recentes",
      description: recentDiagnostics.length > 0
        ? recentDiagnostics.slice(0, 2).map(d => `${formatDiagnosisName(d.disease)} (${d.confidence}%)`).join(" • ")
        : "Nenhum diagnóstico salvo",
      status: recentDiagnostics.length > 0 ? "concluido" : "vazio",
      action: () => navigate("/explore", { state: { activeTab: "diagnostico", showHistory: true } })
    },
    {
      id: 3,
      type: "flight",
      icon: "flight_takeoff",
      title: "Mapa da fazenda",
      description: "Consulte áreas demarcadas e bordas salvas no mapa",
      status: "concluido",
      action: () => navigate("/explore", { state: { activeTab: "mapa" } })
    }
  ]

  return (
    <>
      <div className="act-grid">
        {activities.map((act, index) => {
          const status = {
            pendente: ["act-status-pending", "Pendente"],
            concluido: ["act-status-done", "Concluída"],
            vazio: ["act-status-empty", "Vazio"]
          }[act.status] || ["", ""]

          return (
            <div
              key={act.id}
              className="act-card"
              onClick={act.action}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`act-icon ${act.type}`}>
                <span className="material-symbols-outlined">{act.icon}</span>
              </div>

              <div className="act-content">
                <div className="act-header">
                  <h4 className="act-title">{act.title}</h4>
                  <span className={`act-tag ${status[0]}`}>{status[1]}</span>
                </div>
                <p className="act-desc">{act.description}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="act-footer">
        <button className="act-view-all" onClick={onViewAll}>
          <span>Ver todas as atividades</span>
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </>
  )
}
