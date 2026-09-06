import { useState, useEffect } from "react"
import { formatDiagnosisName } from "./diagnosisLabels"

export default function AllHistory({ onBack }) {
  const [history, setHistory] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState("")

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = () => {
    try {
      const saved = localStorage.getItem("diagnosticHistory")
      if (saved) setHistory(JSON.parse(saved))
    } catch { }
  }

  const saveToLocalStorage = (updatedHistory) => {
    setHistory(updatedHistory)
    localStorage.setItem("diagnosticHistory", JSON.stringify(updatedHistory))
  }

  const deleteItem = (id) => {
    const updated = history.filter(item => item.id !== id)
    saveToLocalStorage(updated)
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    setEditValue(formatDiagnosisName(item.disease))
  }

  const saveEdit = (id) => {
    if (editValue.trim() === "") return
    const updated = history.map(item =>
      item.id === id ? { ...item, disease: editValue.trim() } : item
    )
    saveToLocalStorage(updated)
    setEditingId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  return (
    <div className="all-history-container">
      <div className="all-history-header">
        <button className="back-button" onClick={onBack}>
          <span className="material-symbols-outlined">arrow_back</span>
          Voltar
        </button>
        <h1>Histórico de Análises</h1>
        <p>Consulte triagens individuais e levantamentos com múltiplas fotos</p>
      </div>

      {history.length === 0 ? (
        <div className="empty-history-large">
          <div className="empty-icon">
            <span className="material-symbols-outlined">history</span>
          </div>
          <p className="empty-title">Nenhuma triagem encontrada</p>
          <p className="empty-description">Faça uma análise para começar.</p>
          <button className="btn primary" onClick={onBack}>Voltar ao início</button>
        </div>
      ) : (
        <div className="history-grid">
          {history.map(item => (
            <div key={item.id} className="history-card-full">
              <div className="history-card-header">
                <div className="history-icon-large">
                  <span className="material-symbols-outlined">{item.type === "batch" ? "flight" : "eco"}</span>
                </div>
                <div className="history-card-actions">
                  {editingId === item.id ? (
                    <>
                      <button className="icon-btn save" onClick={() => saveEdit(item.id)}>
                        <span className="material-symbols-outlined">check</span>
                      </button>
                      <button className="icon-btn cancel" onClick={cancelEdit}>
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="icon-btn edit" onClick={() => startEdit(item)}>
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      <button className="icon-btn delete" onClick={() => deleteItem(item.id)}>
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="history-card-content">
                {editingId === item.id ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="edit-input"
                    autoFocus
                  />
                ) : (
                  <h3 className="disease-name">{formatDiagnosisName(item.disease)}</h3>
                )}
                {item.fieldAreaName && item.fieldAreaName !== "Talhão não informado" && (
                  <div className="history-field-area">
                    <span className="material-symbols-outlined">landscape</span>
                    {item.fieldAreaName}
                  </div>
                )}
                {item.type === "batch" && (
                  <div className="batch-history-meta">
                    <span><strong>{item.imageCount || 0}</strong> fotos</span>
                    <span><strong>{item.reliableCount || 0}</strong> confiáveis</span>
                    <span><strong>{item.conditionCount || 0}</strong> condições</span>
                  </div>
                )}
                <div className="confidence-info">
                  <span className="confidence-percent">{item.confidence}% {item.type === "batch" ? "de confiança média" : "de confiança"}</span>
                  <div className="confidence-bar-full">
                    <div className="confidence-fill-full" style={{ width: `${item.confidence}%` }} />
                  </div>
                </div>
                <div className="history-date-full">{item.date}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .all-history-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          min-height: 100vh;
        }
        .all-history-header {
          text-align: center;
          margin-bottom: 3rem;
          position: relative;
        }
        .back-button {
          position: absolute;
          left: 0;
          top: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(63, 127, 86, 0.08);
          border: 1px solid rgba(63, 127, 86, 0.25);
          padding: 0.5rem 1.2rem;
          border-radius: 40px;
          color: #3f7f56;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
        }
        .back-button:hover {
          background: rgba(63, 127, 86, 0.2);
          transform: translateX(-4px);
          box-shadow: 0 0 12px rgba(63, 127, 86, 0.3);
        }
        .all-history-header h1 {
          font-size: 2.2rem;
          background: linear-gradient(135deg, #3f7f56, #0066ff);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          margin-bottom: 0.5rem;
          letter-spacing: -0.02em;
        }
        .all-history-header p {
          color: #8fa3b8;
          font-size: 1rem;
        }
        .history-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 1.5rem;
        }
        .history-card-full {
          background: transparent;
          border: 1px solid rgba(63, 127, 86, 0.25);
          border-radius: 28px;
          padding: 1.5rem;
          transition: all 0.3s ease;
        }
        .history-card-full:hover {
          border-color: #3f7f56;
          transform: translateY(-6px);
          box-shadow: 0 0 0 1px rgba(63, 127, 86, 0.3), 0 12px 28px rgba(0,0,0,0.4);
        }
        .history-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .history-icon-large {
          width: 52px;
          height: 52px;
          background: rgba(63, 127, 86, 0.1);
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(63, 127, 86, 0.4);
        }
        .history-icon-large span {
          font-size: 30px;
          color: #3f7f56;
        }
        .history-card-actions {
          display: flex;
          gap: 0.5rem;
        }
        .icon-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0.4rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .icon-btn span { font-size: 22px; }
        .icon-btn.edit { color: #00ccff; }
        .icon-btn.delete { color: #ff4d4d; }
        .icon-btn.save { color: #3f7f56; }
        .icon-btn.cancel { color: #aaa; }
        .icon-btn:hover {
          background: rgba(255,255,255,0.08);
          transform: scale(1.08);
        }
        .disease-name {
          font-size: 1.3rem;
          font-weight: 600;
          color: #fff;
          margin-bottom: 0.75rem;
          word-break: break-word;
        }
        .edit-input {
          width: 100%;
          padding: 0.6rem;
          background: #050a07;
          border: 1px solid #3f7f56;
          border-radius: 16px;
          color: #fff;
          font-size: 1rem;
          margin-bottom: 0.75rem;
          outline: none;
        }
        .confidence-info {
          margin-bottom: 0.75rem;
        }
        .batch-history-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          margin: -0.1rem 0 0.85rem;
        }
        .history-field-area {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          margin: -0.1rem 0 0.8rem;
          padding: 0.38rem 0.6rem;
          border: 1px solid rgba(63, 127, 86, 0.18);
          border-radius: 999px;
          color: #b8ead0;
          background: rgba(63, 127, 86, 0.07);
          font-size: 0.69rem;
          font-weight: 700;
        }
        .history-field-area .material-symbols-outlined { font-size: 15px; }
        .batch-history-meta span {
          padding: 0.38rem 0.58rem;
          border: 1px solid rgba(63, 127, 86, 0.14);
          border-radius: 9px;
          color: #7f92a3;
          background: rgba(63, 127, 86, 0.04);
          font-size: 0.66rem;
        }
        .batch-history-meta strong {
          color: #dce7e2;
        }
        .confidence-percent {
          font-size: 0.9rem;
          font-weight: 600;
          color: #3f7f56;
          display: inline-block;
          margin-bottom: 0.3rem;
        }
        .confidence-bar-full {
          height: 6px;
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
          overflow: hidden;
        }
        .confidence-fill-full {
          height: 100%;
          background: linear-gradient(90deg, #3f7f56, #0066ff);
          border-radius: 3px;
        }
        .history-date-full {
          font-size: 0.75rem;
          color: #6c7c8c;
          margin-top: 0.5rem;
        }
        .empty-history-large {
          text-align: center;
          padding: 4rem 2rem;
          background: transparent;
          border-radius: 36px;
          margin-top: 2rem;
          border: 1px dashed rgba(63, 127, 86, 0.3);
        }
        .empty-history-large .empty-icon {
          width: 90px;
          height: 90px;
          margin: 0 auto 1rem;
          background: rgba(63, 127, 86, 0.08);
          border-radius: 45px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(63, 127, 86, 0.3);
        }
        .empty-icon span { font-size: 48px; color: #3f7f56; }
        .empty-title { font-size: 1.2rem; color: #fff; margin-bottom: 0.5rem; }
        .empty-description { color: #8fa3b8; margin-bottom: 1.5rem; }
        .btn.primary {
          margin-top: 1rem;
          padding: 0.7rem 1.8rem;
          background: linear-gradient(135deg, #3f7f56, #0066ff);
          border: none;
          border-radius: 40px;
          font-weight: 600;
          cursor: pointer;
          color: #000;
          transition: all 0.2s;
        }
        .btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(63, 127, 86, 0.4);
        }
        @media (max-width: 768px) {
          .all-history-container { padding: 1rem; }
          .history-grid { grid-template-columns: 1fr; gap: 1rem; }
          .back-button { position: static; margin-bottom: 1rem; display: inline-flex; }
          .all-history-header { text-align: left; }
          .all-history-header h1 { font-size: 1.6rem; }
          .history-card-full { padding: 1.2rem; }
        }
      `}</style>
    </div>
  )
}
