// components/Home/MetricsGrid.jsx
import MetricCard from './MetricCard'

export default function MetricsGrid({ hasFarm, weather, farmData }) {
  return (
    <section className="cards-section">
      <div className="section-header">
        <h2 className="section-title">
          <span className="material-symbols-outlined">dashboard</span>
          Monitoramento em Tempo Real
        </h2>
        <div className="section-badge">
          <span className="live-dot"></span>
          <span>AO VIVO</span>
        </div>
      </div>

      <div className="cards-grid">
        <MetricCard 
          type="temperature"
          icon="thermostat"
          label="Temperatura"
          sublabel="Ambiente"
          value={weather?.temperature}
          unit="°C"
          hasFarm={hasFarm}
          weather={weather}
        />

        <MetricCard 
          type="humidity"
          icon="humidity_percentage"
          label="Umidade"
          sublabel="Solo"
          value={weather?.humidity}
          unit="%"
          hasFarm={hasFarm}
          weather={weather}
        />

        <MetricCard type="drone" icon="flight" label="Drone" sublabel="DJI Phantom 4" hasFarm={hasFarm}>
          <div className="drone-status">
            <div className="status-indicator online">
              <div className="pulse-ring"></div>
              <div className="status-dot"></div>
            </div>
            <div className="drone-info">
              <span className="status-text">Pronto para voo</span>
              <span className="drone-location">Base: Setor A12</span>
            </div>
          </div>
        </MetricCard>

       <MetricCard
          type="area"
          icon="landscape"
          label="Área Total"
          sublabel="Plantação"
          value={farmData?.area_total}
          unit="ha"
          hasFarm={!!farmData}
        />
      </div>
    </section>
  )
}