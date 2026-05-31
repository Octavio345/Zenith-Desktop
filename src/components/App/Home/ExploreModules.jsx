// components/Home/ExploreModules.jsx
import { useNavigate } from "react-router-dom"

const modules = [
  { 
    id: "diagnostico",
    path: "/explore", 
    tab: "diagnostico",
    icon: "eco", 
    label: "Diagnóstico", 
    sublabel: "Análise de plantas", 
    type: "diagnose" 
  },
  { 
    id: "clima",
    path: "/explore", 
    tab: "clima",
    icon: "cloud", 
    label: "Clima", 
    sublabel: "Previsão 7 dias", 
    type: "weather" 
  },
  { 
    id: "diario",
    path: "/explore", 
    tab: "diario",
    icon: "menu_book", 
    label: "Diário", 
    sublabel: "Registros da plantação", 
    type: "diary" 
  },
  { 
    id: "mapa",
    path: "/explore", 
    tab: "mapa",
    icon: "map", 
    label: "Mapa", 
    sublabel: "Visualização 3D", 
    type: "map" 
  },
  { 
    id: "estoque",
    path: "/explore", 
    tab: "estoque",
    icon: "inventory", 
    label: "Estoque", 
    sublabel: "Insumos e materiais", 
    type: "stock" 
  },
  { 
    id: "atividades",
    path: "/explore", 
    tab: "atividades",
    icon: "assignment", 
    label: "Atividades", 
    sublabel: "Tarefas do campo", 
    type: "reports"  // ← Mantendo "reports" para não quebrar o CSS
  }
]

export default function ExploreModules({ onNavigate }) {
  const navigate = useNavigate()

  const handleNavigate = (module) => {
    navigate(module.path, { state: { activeTab: module.tab } })
  }

  return (
    <section className="explore-section">
      <h2 className="section-title">
        <span className="material-symbols-outlined">explore</span>
        Módulos do Sistema
      </h2>

      <div className="explore-grid">
        {modules.map((module) => (
          <button
            key={module.id}
            className="explore-card glass"
            onClick={() => handleNavigate(module)}
          >
            <div className={`explore-icon ${module.type}`}>
              <span className="material-symbols-outlined">{module.icon}</span>
              <div className="icon-glow"></div>
            </div>
            <span className="explore-label">{module.label}</span>
            <span className="explore-sublabel">{module.sublabel}</span>
          </button>
        ))}
      </div>
    </section>
  )
}