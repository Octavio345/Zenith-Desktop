// components/Home/MetricCard.jsx
export default function MetricCard({ 
  type, 
  icon, 
  label, 
  sublabel, 
  value, 
  unit, 
  hasFarm, 
  weather,
  children 
}) {
  const getHumidityStatus = (humidity) => {
    if (humidity < 10) return { label: "Crítico", className: "critical", icon: "warning", color: "#224fe4ff" }
    if (humidity < 20) return { label: "Muito Seco", className: "very-dry", icon: "water_drop", color: "#224fe4ff" }
    if (humidity < 30) return { label: "Seco", className: "dry", icon: "water_drop", color: "#224fe4ff" }
    if (humidity < 40) return { label: "Moderado", className: "moderate", icon: "water_drop", color: "#224fe4ff" }
    if (humidity < 60) return { label: "Ideal", className: "ideal", icon: "check_circle", color: "#224fe4ff" }
    if (humidity < 70) return { label: "Úmido", className: "wet", icon: "water_drop", color: "#224fe4ff" }
    if (humidity < 80) return { label: "Muito Úmido", className: "very-wet", icon: "water_drop", color: "#224fe4ff" }
     if (humidity < 100) return { label: "Extremamente Úmido", className: "very-wet", icon: "water_drop", color: "#224fe4ff" }
    return { label: "Excesso", className: "excess", icon: "warning", color: "#224fe4ff" }
  }

  return (
    <div className={`metric-card glass ${!hasFarm && 'disabled'}`}>
      <div className="card-corner"></div>
      <div className="card-header">
        <div className={`card-icon ${type}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div className="card-info">
          <span className="card-label">{label}</span>
          <span className="card-sublabel">{sublabel}</span>
        </div>
      </div>
      
      <div className="card-main">
        {children ? children : (
          hasFarm ? (
            <>
              <span className="card-value">{value}</span>
              <span className="card-unit">{unit}</span>
            </>
          ) : (
            <span className="card-placeholder">—</span>
          )
        )}
      </div>
      
      <div className="card-footer">
        {type === 'humidity' && hasFarm && weather?.humidity !== undefined ? (
          <>
            <div className="humidity-bar">
              <div 
                className="humidity-fill"
                style={{ 
                  width: `${weather.humidity}%`,
                  backgroundColor: getHumidityStatus(weather.humidity).color
                }}
              ></div>
            </div>
            <div 
              className="card-badge"
              style={{ 
                background: `${getHumidityStatus(weather.humidity).color}20`,
                color: getHumidityStatus(weather.humidity).color,
                borderColor: `${getHumidityStatus(weather.humidity).color}40`
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                {getHumidityStatus(weather.humidity).icon}
              </span>
              <span>{getHumidityStatus(weather.humidity).label}</span>
            </div>
          </>
        ) : type === 'drone' && hasFarm ? (
          <div className="battery-indicator">
            <span className="material-symbols-outlined battery-icon">battery_full</span>
            <div className="battery-level">
              <div className="battery-fill" style={{ width: '94%' }}></div>
            </div>
            <span className="battery-percent">94%</span>
          </div>
        ) : type === 'area' && hasFarm ? (
          <>
            <div className="area-chart">
              <div className="chart-bar" style={{ height: '60%' }}></div>
              <div className="chart-bar" style={{ height: '80%' }}></div>
              <div className="chart-bar" style={{ height: '40%' }}></div>
              <div className="chart-bar" style={{ height: '90%' }}></div>
            </div>
            <div className="card-badge">
              <span>+12%</span>
            </div>
          </>
        ) : hasFarm && weather ? (
          <>
            <div className="trend-indicator positive">
              <span className="material-symbols-outlined">trending_up</span>
              <span>+2.3%</span>
            </div>
            <div className="card-badge">
              <span className="badge-dot"></span>
              <span>Estável</span>
            </div>
          </>
        ) : (
          <div className="card-badge disabled">Offline</div>
        )}
      </div>
    </div>
  )
}