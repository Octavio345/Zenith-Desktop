import { useState, useEffect } from "react"
import { useFarm } from "./hooks/useFarm"
import "../../../styles/App/Explore.css"

const API_KEY = "d77668673cf15b7d0488f921007cbd6b"

export default function ClimaTab() {
  const { farmData, loading: farmLoading } = useFarm()

  const [weatherData, setWeatherData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchWeather = async () => {
    if (!farmData) {
      setError("Nenhuma fazenda cadastrada")
      setLoading(false)
      return
    }

    if (!farmData.municipio || !farmData.uf) {
      setError("Localização da fazenda incompleta")
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const city = encodeURIComponent(farmData.municipio)
      const state = farmData.uf

      const weatherRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city},${state},BR&appid=${API_KEY}&units=metric&lang=pt_br`
      )
      const weather = await weatherRes.json()

      const forecastRes = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${city},${state},BR&appid=${API_KEY}&units=metric&lang=pt_br`
      )
      const forecast = await forecastRes.json()

      let minTempDay = weather.main.temp
      let maxTempDay = weather.main.temp

      if (forecast.cod === "200") {
        const today = new Date().toISOString().split("T")[0]
        const todayList = forecast.list.filter(item =>
          item.dt_txt.startsWith(today)
        )
        if (todayList.length > 0) {
          const temps = todayList.map(item => item.main.temp)
          minTempDay = Math.min(...temps)
          maxTempDay = Math.max(...temps)
        }
      }

      if (weather.cod === 200) {
        setWeatherData({
          city: weather.name,
          state,
          farmName: farmData.name,
          temperature: Math.round(weather.main.temp),
          feelsLike: Math.round(weather.main.feels_like),
          tempMin: Math.round(minTempDay),
          tempMax: Math.round(maxTempDay),
          humidity: weather.main.humidity,
          pressure: weather.main.pressure,
          windSpeed: weather.wind.speed,
          windDeg: weather.wind.deg,
          windGust: weather.wind.gust || 0,
          rain: weather.rain?.["1h"] || 0,
          description: weather.weather[0].description,
          icon: weather.weather[0].icon,
          clouds: weather.clouds.all,
          visibility: weather.visibility / 1000,
          sunrise: new Date(weather.sys.sunrise * 1000).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          sunset: new Date(weather.sys.sunset * 1000).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          date: new Date().toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          }),
          updatedAt: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        })
      } else {
        setError("Cidade não encontrada")
      }
    } catch (err) {
      console.error(err)
      setError("Erro ao buscar clima")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!farmLoading) fetchWeather()
  }, [farmData, farmLoading])

  const getWindDirection = (deg = 0) => {
    const dirs = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"]
    return dirs[Math.round(deg / 45) % 8]
  }

  const formatDecimal = (value, digits = 1) => {
    const number = Number(value)
    if (!Number.isFinite(number)) return "0"
    return number.toFixed(digits).replace(".", ",")
  }

  const getRecommendations = () => {
    if (!weatherData) return []

    const recommendations = []

    if (weatherData.humidity < 50 && weatherData.rain === 0) {
      recommendations.push({
        type: "warning",
        icon: "water_drop",
        title: "Solo seco",
        msg: "Irrigação recomendada"
      })
    }

    if (weatherData.humidity > 80) {
      recommendations.push({
        type: "warning",
        icon: "humidity_high",
        title: "Alta umidade",
        msg: "Risco de fungos. Monitore as plantas"
      })
    }

    if (weatherData.temperature > 32) {
      recommendations.push({
        type: "warning",
        icon: "local_fire_department",
        title: "Calor intenso",
        msg: "Proteja plantas sensíveis do sol forte"
      })
    }

    if (weatherData.temperature < 15) {
      recommendations.push({
        type: "warning",
        icon: "ac_unit",
        title: "Temperatura baixa",
        msg: "Risco de geada. Proteja as plantas"
      })
    }

    if (weatherData.windSpeed > 8) {
      recommendations.push({
        type: "danger",
        icon: "air",
        title: "Vento forte",
        msg: "Evite pulverização e verifique estruturas"
      })
    }

    if (weatherData.rain > 5) {
      recommendations.push({
        type: "info",
        icon: "rainy_heavy",
        title: "Chuva forte",
        msg: "Suspenda irrigação e verifique drenagem"
      })
    }

    if (weatherData.humidity >= 50 && weatherData.humidity <= 70 &&
        weatherData.temperature >= 20 && weatherData.temperature <= 30 &&
        weatherData.windSpeed <= 5 && weatherData.rain === 0) {
      recommendations.push({
        type: "success",
        icon: "agriculture",
        title: "Condições ideais",
        msg: "Perfeito para atividades no campo"
      })
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: "success",
        icon: "check_circle",
        title: "Condição favorável",
        msg: "Boa leitura geral para atividades agrícolas de rotina."
      })
    }

    return recommendations.slice(0, 4)
  }

  const recommendations = getRecommendations()

  // ========== LOADING (INTRO) - EXATAMENTE IGUAL AO SEU CÓDIGO ==========
  if (loading || farmLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingIcon}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--primary)' }}>cloud</span>
          </div>
          <h3 style={styles.loadingTitle}>Buscando clima</h3>
          <p style={styles.loadingText}>
            {farmData ? `Obtendo dados para ${farmData.municipio}...` : 'Carregando...'}
          </p>
        </div>
      </div>
    )
  }

  // ========== ERRO - TAMBÉM IGUAL AO SEU CÓDIGO ==========
  if (error || !weatherData) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--danger)' }}>error</span>
          </div>
          <h3 style={styles.errorTitle}>Ops!</h3>
          <p style={styles.errorText}>{error || "Não foi possível obter os dados"}</p>
          {farmData && (
            <button style={styles.retryButton} onClick={fetchWeather}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
              Tentar novamente
            </button>
          )}
        </div>
      </div>
    )
  }

  // ========== CONTEÚDO PRINCIPAL COM DESIGN PREMIUM ==========
  return (
    <div className="clima-premium-dashboard">
      <style>{`
        .clima-premium-dashboard {
          max-width: 1240px;
          margin: 0 auto;
          padding: 1.5rem 1rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.4rem;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          cursor: default;
          user-select: none;
        }

        .clima-premium-dashboard * {
          cursor: default;
          user-select: none;
        }

        .clima-main-desktop-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.32fr) minmax(330px, 0.88fr);
          gap: 1.25rem;
          align-items: stretch;
        }

        .clima-panel {
          background: linear-gradient(145deg, rgba(9, 24, 17, 0.98), rgba(7, 14, 20, 0.96));
          border: 1px solid rgba(0, 255, 170, 0.16);
          border-radius: 18px;
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.42);
          overflow: hidden;
          position: relative;
        }

        .clima-panel::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(135deg, rgba(0, 255, 170, 0.08), transparent 34%, rgba(0, 102, 255, 0.06));
          opacity: 0.8;
        }

        .clima-hero-card {
          padding: 1.6rem;
          min-height: 330px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 1.6rem;
        }

        .clima-hero-header,
        .clima-hero-body,
        .clima-quick-row,
        .clima-section-header,
        .clima-rec-list,
        .clima-metric-grid,
        .clima-footer-meta {
          position: relative;
          z-index: 1;
        }

        .clima-hero-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .clima-location {
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
          min-width: 0;
        }

        .clima-location-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #00ffaa;
          background: rgba(0, 255, 170, 0.08);
          border: 1px solid rgba(0, 255, 170, 0.24);
          flex-shrink: 0;
        }

        .clima-location h2 {
          margin: 0;
          color: #ffffff;
          font-size: clamp(1.35rem, 2vw, 1.85rem);
          line-height: 1.12;
          overflow-wrap: anywhere;
        }

        .clima-location p {
          margin: 0.28rem 0 0;
          color: #8fa3a0;
          font-size: 0.88rem;
          overflow-wrap: anywhere;
        }

        .clima-refresh-btn {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(5, 10, 7, 0.82);
          color: #dce7e2;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .clima-refresh-btn:hover {
          color: #00ffaa;
          border-color: rgba(0, 255, 170, 0.42);
          transform: rotate(45deg);
        }

        .clima-hero-body {
          display: grid;
          grid-template-columns: minmax(230px, 0.8fr) minmax(0, 1fr);
          align-items: center;
          gap: 1.4rem;
        }

        .clima-temperature-block {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          gap: 0.15rem;
          padding: 1.15rem 1.35rem;
          border-radius: 18px;
          background: linear-gradient(135deg, #00ffaa, #00b8ff);
          box-shadow: 0 22px 42px rgba(0, 255, 170, 0.16);
        }

        .clima-temperature-block strong {
          color: #04120c;
          font-size: clamp(3.4rem, 5vw, 4.7rem);
          font-weight: 850;
          letter-spacing: 0;
          line-height: 0.92;
        }

        .clima-temperature-block span {
          margin-top: 0.2rem;
          color: #04120c;
          font-size: 1.3rem;
          font-weight: 800;
        }

        .clima-condition-stack {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .clima-condition-main {
          display: flex;
          align-items: center;
          gap: 0.9rem;
        }

        .clima-condition-main img {
          width: 70px;
          height: 70px;
          object-fit: contain;
          filter: drop-shadow(0 12px 18px rgba(0, 0, 0, 0.35));
        }

        .clima-condition-main h3 {
          margin: 0;
          color: #ffffff;
          font-size: clamp(1.15rem, 1.8vw, 1.55rem);
          text-transform: capitalize;
          overflow-wrap: anywhere;
        }

        .clima-condition-main p,
        .clima-field-name {
          margin: 0.25rem 0 0;
          color: #9aaca8;
          font-size: 0.92rem;
        }

        .clima-quick-row {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.75rem;
        }

        .clima-quick-card {
          background: rgba(5, 10, 7, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 14px;
          padding: 0.85rem;
          min-width: 0;
        }

        .clima-quick-card small {
          display: block;
          color: #7d918d;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 0.35rem;
        }

        .clima-quick-card strong {
          color: #ffffff;
          font-size: 1.02rem;
          overflow-wrap: anywhere;
        }

        .clima-recommendations {
          padding: 1.35rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .clima-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          padding-bottom: 0.75rem;
        }

        .clima-section-title {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          color: #ffffff;
          font-size: 0.82rem;
          font-weight: 800;
          letter-spacing: 0.05em;
        }

        .clima-section-title span {
          color: #00ffaa;
        }

        .clima-rec-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .clima-rec-card {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 0.75rem;
          align-items: flex-start;
          padding: 0.9rem;
          border-radius: 14px;
          background: rgba(5, 10, 7, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-left: 4px solid #38bdf8;
        }

        .clima-rec-card.type-success { border-left-color: #00ffaa; }
        .clima-rec-card.type-warning { border-left-color: #facc15; }
        .clima-rec-card.type-danger { border-left-color: #f87171; }
        .clima-rec-card.type-info { border-left-color: #38bdf8; }

        .clima-rec-card > span {
          color: #38bdf8;
          margin-top: 0.1rem;
        }

        .clima-rec-card.type-success > span { color: #00ffaa; }
        .clima-rec-card.type-warning > span { color: #facc15; }
        .clima-rec-card.type-danger > span { color: #f87171; }

        .clima-rec-card strong {
          display: block;
          color: #ffffff;
          font-size: 0.95rem;
          margin-bottom: 0.15rem;
        }

        .clima-rec-card p {
          margin: 0;
          color: #9aaca8;
          line-height: 1.38;
          font-size: 0.86rem;
          overflow-wrap: anywhere;
        }

        .clima-metrics-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .clima-metric-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 0.85rem;
        }

        .clima-metric-card {
          display: flex;
          align-items: center;
          gap: 0.78rem;
          min-width: 0;
          padding: 1rem;
          border-radius: 14px;
          background: #0a1810;
          border: 1px solid rgba(0, 255, 170, 0.14);
          transition: all 0.2s ease;
        }

        .clima-metric-card:hover {
          border-color: rgba(0, 255, 170, 0.38);
          transform: translateY(-2px);
        }

        .clima-metric-card > span {
          width: 38px;
          height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          color: #00ffaa;
          background: rgba(0, 255, 170, 0.08);
          flex-shrink: 0;
        }

        .clima-metric-card small {
          display: block;
          color: #7d918d;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        .clima-metric-card strong {
          display: block;
          color: #ffffff;
          font-size: 1rem;
          margin-top: 0.15rem;
          overflow-wrap: anywhere;
        }

        .clima-footer-meta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          color: #7d918d;
          font-size: 0.82rem;
        }

        @media (max-width: 1100px) {
          .clima-main-desktop-grid,
          .clima-hero-body {
            grid-template-columns: 1fr;
          }

          .clima-metric-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .clima-quick-row,
          .clima-metric-grid {
            grid-template-columns: 1fr;
          }

          .clima-hero-header {
            align-items: flex-start;
          }
        }
      `}</style>

      <div className="clima-main-desktop-grid">
        <section className="clima-panel clima-hero-card">
          <div className="clima-hero-header">
            <div className="clima-location">
              <span className="material-symbols-outlined clima-location-icon">location_on</span>
              <div>
                <h2>{weatherData.city}, {weatherData.state}</h2>
                <p>{weatherData.date}</p>
                {weatherData.farmName && <p className="clima-field-name">{weatherData.farmName}</p>}
              </div>
            </div>

            <button className="clima-refresh-btn" onClick={fetchWeather} title="Atualizar clima">
              <span className="material-symbols-outlined">refresh</span>
            </button>
          </div>

          <div className="clima-hero-body">
            <div className="clima-temperature-block">
              <strong>{weatherData.temperature}</strong>
              <span>°C</span>
            </div>

            <div className="clima-condition-stack">
              <div className="clima-condition-main">
                <img
                  src={`https://openweathermap.org/img/wn/${weatherData.icon}@2x.png`}
                  alt={weatherData.description}
                />
                <div>
                  <h3>{weatherData.description}</h3>
                  <p>Sensação térmica: <strong>{weatherData.feelsLike}°C</strong></p>
                </div>
              </div>
            </div>
          </div>

          <div className="clima-quick-row">
            <div className="clima-quick-card">
              <small>Mínima</small>
              <strong>{weatherData.tempMin}°C</strong>
            </div>
            <div className="clima-quick-card">
              <small>Máxima</small>
              <strong>{weatherData.tempMax}°C</strong>
            </div>
            <div className="clima-quick-card">
              <small>Vento</small>
              <strong>{formatDecimal(weatherData.windSpeed)} m/s</strong>
            </div>
            <div className="clima-quick-card">
              <small>Chuva 1h</small>
              <strong>{formatDecimal(weatherData.rain)} mm</strong>
            </div>
          </div>
        </section>

        <aside className="clima-panel clima-recommendations">
          <div className="clima-section-header">
            <div className="clima-section-title">
              <span className="material-symbols-outlined">psychology</span>
              RECOMENDAÇÕES DE MANEJO
            </div>
          </div>

          <div className="clima-rec-list">
            {recommendations.map((rec, index) => (
              <div key={index} className={`clima-rec-card type-${rec.type}`}>
                <span className="material-symbols-outlined">{rec.icon}</span>
                <div>
                  <strong>{rec.title}</strong>
                  <p>{rec.msg}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <section className="clima-metrics-section">
        <div className="clima-section-header">
          <div className="clima-section-title">
            <span className="material-symbols-outlined">analytics</span>
            MÉTRICAS METEOROLÓGICAS
          </div>
        </div>

        <div className="clima-metric-grid">
          {[
            { icon: "humidity_percentage", label: "Umidade", value: `${weatherData.humidity}%` },
            { icon: "air", label: "Vento", value: `${formatDecimal(weatherData.windSpeed)} m/s ${getWindDirection(weatherData.windDeg)}` },
            { icon: "speed", label: "Pressão", value: `${weatherData.pressure} hPa` },
            { icon: "rainy", label: "Chuva", value: `${formatDecimal(weatherData.rain)} mm` },
            { icon: "airwave", label: "Rajada", value: `${formatDecimal(weatherData.windGust)} m/s` },
            { icon: "visibility", label: "Visibilidade", value: `${formatDecimal(weatherData.visibility)} km` },
            { icon: "cloud", label: "Nuvens", value: `${weatherData.clouds}%` },
            { icon: "sunny", label: "Nascer do sol", value: weatherData.sunrise },
            { icon: "nightlight", label: "Pôr do sol", value: weatherData.sunset },
            { icon: "update", label: "Atualizado", value: weatherData.updatedAt }
          ].map(item => (
            <div key={item.label} className="clima-metric-card">
              <span className="material-symbols-outlined">{item.icon}</span>
              <div>
                <small>{item.label}</small>
                <strong>{item.value}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="clima-footer-meta">
        <span className="material-symbols-outlined">verified</span>
        <span>Dados meteorológicos em tempo real para apoio ao manejo agrícola</span>
      </div>
    </div>
  )
}

// ========== ESTILOS DO LOADING E ERRO (EXATAMENTE DO SEU CÓDIGO) ==========
const styles = {
  loadingContainer: {
    minHeight: '70vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    width: '100%',
    boxSizing: 'border-box',
  },
  loadingCard: {
    background: 'rgba(18, 22, 28, 0.8)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '28px',
    padding: '32px 24px',
    textAlign: 'center',
    width: '100%',
    maxWidth: '280px',
  },
  loadingIcon: {
    marginBottom: '14px',
  },
  loadingTitle: {
    color: '#fff',
    margin: '0 0 6px 0',
    fontSize: '1.2rem',
  },
  loadingText: {
    color: '#a0a8b4',
    margin: 0,
    fontSize: '0.9rem',
  },
  errorCard: {
    background: 'rgba(18, 22, 28, 0.8)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,68,68,0.2)',
    borderRadius: '28px',
    padding: '32px 24px',
    textAlign: 'center',
    width: '100%',
    maxWidth: '280px',
  },
  errorIcon: {
    marginBottom: '14px',
  },
  errorTitle: {
    color: '#ff4d4d',
    margin: '0 0 6px 0',
    fontSize: '1.2rem',
  },
  errorText: {
    color: '#a0a8b4',
    margin: '0 0 16px 0',
    fontSize: '0.9rem',
  },
  retryButton: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '26px',
    padding: '10px 20px',
    color: '#fff',
    fontWeight: '600',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
}