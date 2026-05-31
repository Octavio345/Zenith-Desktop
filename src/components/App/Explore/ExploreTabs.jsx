const tabs = [
  { id: "diagnostico", icon: "eco", label: "Diagnóstico" },
  { id: "clima", icon: "cloud", label: "Clima" },
  { id: "diario", icon: "menu_book", label: "Diário" },
  { id: "mapa", icon: "map", label: "Mapa" },
  { id: "estoque", icon: "inventory", label: "Estoque" }
]

export default function ExploreTabs({ activeTab, onTabChange }) {
  return (
    <div className="explorar-tabs">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
          onClick={() => onTabChange(tab.id)}
        >
          <span className="material-symbols-outlined">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}