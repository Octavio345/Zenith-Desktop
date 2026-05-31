// components/App/Profile/FarmInfoView.jsx
import { motion } from "framer-motion"

const FarmInfoView = ({ farmData, onAddFarm, onEditFarm, formatPhone }) => {
  if (!farmData) {
    return (
      <motion.div 
        className="empty-state-tech"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="empty-icon-container">
          <span className="material-symbols-outlined empty-icon">agriculture</span>
          <div className="empty-ring"></div>
          <div className="empty-ring-2"></div>
        </div>
        
        <h4>Nenhuma fazenda cadastrada</h4>
        <p>Cadastre sua primeira fazenda para começar a monitorar suas safras</p>
        
        <button className="empty-action-btn" onClick={onAddFarm}>
          <span className="material-symbols-outlined">add</span>
          Cadastrar Fazenda
        </button>
      </motion.div>
    )
  }

  const formatDate = (dateString) => {
    if (!dateString) return "Não informado"
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR')
  }

  const formatArea = (area) => {
    if (!area) return "0"
    return parseFloat(area).toFixed(1).replace('.', ',')
  }

  return (
    <motion.div 
      className="profile-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="card-corner"></div>
      
      <div className="card-header">
        <div className="header-icon">
          <span className="material-symbols-outlined">agriculture</span>
          <div className="icon-glow"></div>
        </div>
        <h3>{farmData.name || "Fazenda"}</h3>
        <div className="header-line"></div>
      </div>

      <div className="farm-info-grid">
        {/* Área Total */}
        <div className="info-item-tech highlight">
          <div className="info-label">
            <span className="material-symbols-outlined">square_foot</span>
            <span>Área total</span>
          </div>
          <div className="info-value badge">
            {formatArea(farmData.area_total)} ha
            <div className="value-glow"></div>
          </div>
        </div>

        {/* Cultura */}
        {farmData.plantacao && (
          <div className="info-item-tech">
            <div className="info-label">
              <span className="material-symbols-outlined">grass</span>
              <span>Cultura</span>
            </div>
            <div className="info-value">{farmData.plantacao}</div>
          </div>
        )}

        {/* Localização */}
        {(farmData.municipio || farmData.uf) && (
          <div className="info-item-tech">
            <div className="info-label">
              <span className="material-symbols-outlined">location_on</span>
              <span>Localização</span>
            </div>
            <div className="info-value">
              {farmData.municipio}{farmData.uf ? ` - ${farmData.uf}` : ''}
            </div>
          </div>
        )}

        {/* Bairro */}
        {farmData.bairro && (
          <div className="info-item-tech">
            <div className="info-label">
              <span className="material-symbols-outlined">map</span>
              <span>Bairro/Distrito</span>
            </div>
            <div className="info-value">{farmData.bairro}</div>
          </div>
        )}

        {/* CEP */}
        {farmData.cep && (
          <div className="info-item-tech">
            <div className="info-label">
              <span className="material-symbols-outlined">mail</span>
              <span>CEP</span>
            </div>
            <div className="info-value">{farmData.cep}</div>
          </div>
        )}

        {/* Telefone */}
        {farmData.telefone && (
          <div className="info-item-tech">
            <div className="info-label">
              <span className="material-symbols-outlined">call</span>
              <span>Telefone</span>
            </div>
            <div className="info-value">{formatPhone(farmData.telefone)}</div>
          </div>
        )}

        {/* Data de Aquisição */}
        {farmData.data_aquisicao && (
          <div className="info-item-tech">
            <div className="info-label">
              <span className="material-symbols-outlined">calendar_month</span>
              <span>Aquisição</span>
            </div>
            <div className="info-value">{formatDate(farmData.data_aquisicao)}</div>
          </div>
        )}

        {/* Tipo de Proprietário */}
        {farmData.tipo_proprietario && (
          <div className="info-item-tech">
            <div className="info-label">
              <span className="material-symbols-outlined">badge</span>
              <span>Vínculo</span>
            </div>
            <div className="info-value">{farmData.tipo_proprietario}</div>
          </div>
        )}
      </div>

      <button className="edit-farm-btn" onClick={onEditFarm}>
        <span className="material-symbols-outlined">edit</span>
        Editar informações da fazenda
        <div className="btn-glow"></div>
      </button>

      <style jsx>{`
        .farm-info-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .info-item-tech.highlight {
          background: linear-gradient(135deg, rgba(19, 236, 128, 0.05), transparent);
          border-radius: 16px;
          margin: -4px;
          padding: 4px;
        }
        
        .info-item-tech.highlight .info-value {
          background: linear-gradient(135deg, rgba(19, 236, 128, 0.2), rgba(0, 102, 255, 0.1));
          border-color: var(--primary);
          font-weight: 700;
          font-size: 16px;
        }
        
        .edit-farm-btn {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 18px;
          margin-top: 24px;
          background: #0d7c4b;
          border: 1px solid rgba(0, 255, 170, 0.24);
          border-radius: 12px;
          color: #ffffff;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.3s ease;
          box-shadow: 0 12px 26px rgba(13, 124, 75, 0.18);
        }
        
        .edit-farm-btn:hover {
          background: #0e9c5e;
          border-color: rgba(0, 255, 170, 0.4);
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(13, 124, 75, 0.28);
        }
      `}</style>
    </motion.div>
  )
}

export default FarmInfoView
