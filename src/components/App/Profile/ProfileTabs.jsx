// components/Profile/ProfileTabs.jsx
export default function ProfileTabs({ activeTab, onTabChange, onEditClick }) {
  const tabs = [
    { id: "pessoal", icon: "person", label: "Pessoal" },
    { id: "fazenda", icon: "agriculture", label: "Fazenda" }
  ]

  return (
    <div className="profile-tabs-container">
      <div className="tabs-glow"></div>
      <div className="profile-tabs-tech">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-tech ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => tab.action ? tab.action() : onTabChange(tab.id)}
          >
            <span className="material-symbols-outlined tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
            {activeTab === tab.id && <div className="tab-active-indicator"></div>}
          </button>
        ))}
      </div>
    </div>
  )
}
