// components/Home/FlightActionButton.jsx
export default function FlightActionButton({ onNavigate }) {
  return (
    <section className="action-section">
      <button className="flight-action-btn glass" onClick={onNavigate}>
        <div className="btn-content">
          <div className="btn-icon-wrapper">
            <span className="material-symbols-outlined btn-icon">rocket_launch</span>
            <div className="btn-icon-glow"></div>
          </div>
          <div className="btn-text">
            <span className="btn-title">Iniciar Monitoramento</span>
          </div>
          <div className="btn-arrow-wrapper">
            <span className="material-symbols-outlined btn-arrow">arrow_forward</span>
          </div>
        </div>
        <div className="btn-progress">
          <div className="progress-bar" style={{ width: '0%' }}></div>
        </div>
      </button>
    </section>
  )
}