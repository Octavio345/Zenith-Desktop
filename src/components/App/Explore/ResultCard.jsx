import { motion } from "framer-motion"
import "../../../styles/App/Explore.css"

export default function ResultCard({ result, image, onNewDiagnosis }) {
  const getSeverityColor = (severity) => {
    switch(severity?.toLowerCase()) {
      case 'baixa': return '#4caf50'
      case 'média': return '#ff9800'
      case 'alta': return '#f44336'
      default: return '#13ec80'
    }
  }

  return (
    <motion.div 
      className="result-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="result-header">
        <img src={image} alt="Planta" className="result-image" />
        <div className="result-badge">
          <span>🔬 Análise Completa</span>
        </div>
      </div>

      <div className="result-content">
        <h2 className="disease-name">{result.disease}</h2>
        
        <div className="confidence-section">
          <div className="confidence-label">
            <span>Confiança</span>
            <span className="confidence-value">{result.confidence}%</span>
          </div>
          <div className="progress-bar">
            <motion.div 
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${result.confidence}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>

        <div 
          className="severity-tag" 
          style={{ 
            backgroundColor: `${getSeverityColor(result.severity)}20`,
            color: getSeverityColor(result.severity),
            borderColor: `${getSeverityColor(result.severity)}40`
          }}
        >
          ⚠️ Severidade: {result.severity}
        </div>

        <div className="info-section">
          <h4>💊 Tratamento</h4>
          <p>{result.treatment}</p>
        </div>

        <div className="info-section">
          <h4>🛡️ Prevenção</h4>
          <p>{result.prevention}</p>
        </div>

        <div className="result-actions">
          <button onClick={onNewDiagnosis} className="action-btn primary">
            📸 Novo Diagnóstico
          </button>
          <button className="action-btn secondary">
            📄 Relatório
          </button>
        </div>
      </div>
    </motion.div>
  )
}