import { useEffect } from "react"
import "../../../../styles/App/ImagePreview.css"

export default function ImagePreview({ image, onBack, onAnalyze }) {
  // Esconder o menu bar quando o componente montar
  useEffect(() => {
    const menuBar = document.querySelector('.menu-bar')
    if (menuBar) {
      menuBar.style.display = 'none'
    }
    
    // Prevenir scroll
    document.body.style.overflow = 'hidden'
    
    return () => {
      // Restaurar menu bar quando desmontar
      const menuBar = document.querySelector('.menu-bar')
      if (menuBar) {
        menuBar.style.display = 'flex'
      }
      
      // Restaurar scroll
      document.body.style.overflow = 'auto'
    }
  }, [])

  return (
    <div className="preview-container-modern">
      <div className="preview-card">
        {/* Header com gradiente */}
        <div className="preview-header">
          <div className="preview-header-content">
            <span className="preview-title">
              <span className="material-symbols-outlined">image</span>
              Pré-visualização
            </span>
            <span className="preview-badge">Pronto para análise</span>
          </div>
        </div>

        {/* Área da imagem */}
        <div className="preview-image-area">
          <div className="preview-image-wrapper">
            <img
              src={image}
              alt="Imagem selecionada"
              className="preview-image"
            />
            <div className="preview-image-overlay">
              <span className="material-symbols-outlined">photo_camera</span>
            </div>
          </div>
        </div>

        {/* Informações adicionais */}
        <div className="preview-info">
          <div className="info-item">
            <span className="material-symbols-outlined">info</span>
            <span>Imagem carregada com sucesso</span>
          </div>
          <div className="info-item">
            <span className="material-symbols-outlined">analytics</span>
            <span>Análise por IA em tempo real</span>
          </div>
        </div>

        {/* Ações */}
        <div className="preview-actions-modern">
          <button className="action-btn secondary" onClick={onBack}>
            <span className="material-symbols-outlined">arrow_back</span>
            Nova imagem
          </button>
          
          <button className="action-btn primary" onClick={onAnalyze}>
            <span className="material-symbols-outlined">auto_awesome</span>
            Analisar com IA
          </button>
        </div>
      </div>
    </div>
  )
}