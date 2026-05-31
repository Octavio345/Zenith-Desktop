// components/App/Home/ModulesSidebar.jsx
import { useNavigate } from "react-router-dom"

const modules = [
  { id: "diagnostico", path: "/explore", tab: "diagnostico", icon: "eco", label: "Diagnóstico", type: "diagnose" },
  { id: "clima", path: "/explore", tab: "clima", icon: "cloud", label: "Clima", type: "weather" },
  { id: "diario", path: "/explore", tab: "diario", icon: "menu_book", label: "Diário", type: "diary" },
  { id: "mapa", path: "/explore", tab: "mapa", icon: "map", label: "Mapa", type: "map" },
  { id: "estoque", path: "/explore", tab: "estoque", icon: "inventory", label: "Estoque", type: "stock" },
  { id: "atividades", path: "/explore", tab: "atividades", icon: "assignment", label: "Atividades", type: "reports" }
]

export default function ModulesSidebar({ onNavigate }) {
  const navigate = useNavigate()

  const handleNavigate = (module) => {
    navigate(module.path, { state: { activeTab: module.tab } })
  }

  return (
    <div className="modules-sidebar">
      <div className="modules-nav">
        {modules.map((module) => (
          <button
            key={module.id}
            className="module-nav-item glass"
            onClick={() => handleNavigate(module)}
          >
            <div className={`module-nav-icon ${module.type}`}>
              <span className="material-symbols-outlined">{module.icon}</span>
            </div>
            <span className="module-nav-label">{module.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}