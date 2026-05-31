// components/Profile/ProfileStatsRow.jsx
export default function ProfileStatsRow({ hectares, age, farmsCount }) {
  const stats = [
    { icon: "square_foot", value: hectares, label: "Hectares", color: "#13ec80" },
    { icon: "cake", value: age, label: "Idade", color: "#0066ff" },
    { icon: "agriculture", value: farmsCount, label: "Fazendas", color: "#ffaa00" }
  ]

  return (
    <div className="profile-stats-grid">
      {stats.map((stat, index) => (
        <div key={index} className="profile-stat-card glass">
          <div className="stat-icon-wrapper" style={{ background: `${stat.color}20` }}>
            <span className="material-symbols-outlined" style={{ color: stat.color }}>
              {stat.icon}
            </span>
            <div className="stat-icon-glow" style={{ background: stat.color }}></div>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stat.value}</span>
            <span className="stat-label">{stat.label}</span>
          </div>
          <div className="stat-progress">
            <div className="progress-bar" style={{ width: '75%', background: stat.color }}></div>
          </div>
        </div>
      ))}
    </div>
  )
}