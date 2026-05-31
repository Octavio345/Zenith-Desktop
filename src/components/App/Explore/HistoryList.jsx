import "../../../styles/App/Explore.css"

export default function HistoryList({ history }) {
  return (
    <div className="history-section">
      <h3 className="history-title">📋 Histórico</h3>
      <div className="history-grid">
        {history.map(item => (
          <div key={item.id} className="history-item">
            {item.image && <img src={item.image} alt={item.disease} className="history-image" />}
            <div className="history-info">
              <h4>{item.disease}</h4>
              <p>{item.date}</p>
              <p className="history-confidence">{item.confidence}% confiança</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}