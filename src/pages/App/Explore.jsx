
import { useState, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import AppHeader from "../../components/App/Global/AppHeader"
import MenuBar from "../../components/App/Global/MenuBar"
import AppFooter from "../../components/App/Global/AppFooter"
import DiagnosticoTab from "../../components/App/Explore/Diagnostico/DiagnosticoTab"
import ClimaTab from "../../components/App/Explore/ClimaTab"
import DiarioTab from "../../components/App/Explore/DiarioTab"
import MapaTab from "../../components/App/Explore/MapaTab"
import EstoqueTab from "../../components/App/Explore/EstoqueTab"
import AtividadesTab from "../../components/App/Explore/AtividadesTab"
import MonitoramentoView from "../../components/App/Explore/Monitoramento/MonitoramentoView"
import LegislacaoDronesTab from "../../components/App/Explore/LegislacaoDronesTab"
import ParticleBackground from "../../components/App/Home/ParticleBackground"
import MouseGlow from "../../components/App/Home/MouseGlow"
import "../../styles/App/Explore.css"

const tabs = [
  { id: "diagnostico", label: "Análise IA", icon: "eco" },
  { id: "monitoramento", label: "Monitoramento", icon: "psychiatry" },
  { id: "mapa", label: "Mapa", icon: "map" },
  { id: "clima", label: "Clima", icon: "cloud" },
  { id: "diario", label: "Diário", icon: "menu_book" },
  { id: "estoque", label: "Estoque", icon: "inventory" },
  { id: "atividades", label: "Atividades", icon: "assignment" },
  { id: "legislacao", label: "Legislação", icon: "gavel" }
]

const tabContext = {
  diagnostico: ["Análise da soja por IA", "Use fotos para identificar possíveis problemas na soja. Confirme o resultado em campo."],
  monitoramento: ["Análise estrutural do plantio", "Monitore a lavoura de soja por imagens e visão computacional."],
  clima: ["Clima da fazenda", "Condições atuais e previsão para apoiar decisões no campo."],
  diario: ["Diário de campo", "Registre ocorrências, observações e aprendizados da operação."],
  mapa: ["Mapa da propriedade", "Visualize áreas, talhões e pontos importantes da fazenda."],
  estoque: ["Estoque e insumos", "Controle entradas, saídas e níveis críticos com clareza."],
  atividades: ["Atividades", "Planeje tarefas e acompanhe a execução da equipe."],
  legislacao: ["Legislação de drones", "Consulte orientações para operar drones agrícolas com responsabilidade."],
}

export default function Explore() {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem("activeExploreTab")
    return savedTab || "diagnostico"
  })


  useEffect(() => {

    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab)
      localStorage.setItem("activeExploreTab", location.state.activeTab)
    } else {

      const savedTab = localStorage.getItem("activeExploreTab")
      if (savedTab && savedTab !== activeTab) {
        setActiveTab(savedTab)
      }
    }
  }, [location])


  useEffect(() => {
    localStorage.setItem("activeExploreTab", activeTab)
  }, [activeTab])

  const selectTab = (tabId) => {
    localStorage.setItem("activeExploreTab", tabId)
    setActiveTab(tabId)
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }

  const renderTab = () => {
    switch(activeTab) {
      case "diagnostico":
        return <DiagnosticoTab active={activeTab === "diagnostico"} />
      case "monitoramento":
        return <MonitoramentoView />
      case "clima":
        return <ClimaTab />
      case "diario":
        return <DiarioTab />
      case "mapa":
        return <MapaTab />
      case "estoque":
        return <EstoqueTab />
      case "atividades":
        return <AtividadesTab />
      case "legislacao":
        return <LegislacaoDronesTab />
      default:
        return <DiagnosticoTab />
    }
  }

  return (
    <div className={`explore-container explore-container--${activeTab}`}>
      <div className="explore-atmosphere" aria-hidden="true">
        <div className="explore-bg-image" />
        <div className="explore-grid-overlay" />
        <div className="explore-circuit-layer">
          <span className="explore-circuit-dot dot-1" />
          <span className="explore-circuit-dot dot-2" />
          <span className="explore-circuit-dot dot-3" />
          <span className="explore-data-line line-1" />
          <span className="explore-data-line line-2" />
          <span className="explore-float-icon fi-1 material-symbols-outlined">eco</span>
          <span className="explore-float-icon fi-2 material-symbols-outlined">satellite_alt</span>
          <span className="explore-float-icon fi-3 material-symbols-outlined">analytics</span>
        </div>
        <div className="explore-grain-overlay" />
      </div>
      <ParticleBackground />
      <MouseGlow />
      <AppHeader />

      <section className="explore-heading">
        <div>
          <span><span className="material-symbols-outlined">explore</span> Central de operações</span>
          <h1>Explore</h1>
          <p>{tabContext[activeTab][1]}</p>
        </div>
        <aside>
          <span className="material-symbols-outlined">{tabs.find((tab) => tab.id === activeTab)?.icon}</span>
          <div><small>Área atual</small><strong>{tabContext[activeTab][0]}</strong></div>
        </aside>
      </section>

      <div className="explore-tabs-modern">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`explore-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => selectTab(tab.id)}
          >
            <span className="explore-tab-icon material-symbols-outlined">
              {tab.icon}
            </span>
            <span className="explore-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          className="tab-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {renderTab()}
        </motion.div>
      </AnimatePresence>

      <AppFooter />
      <MenuBar />
    </div>
  )
}
