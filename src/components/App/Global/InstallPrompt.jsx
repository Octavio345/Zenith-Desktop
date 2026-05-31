import { motion } from "framer-motion"
import { FaDownload, FaTimes, FaAndroid, FaApple } from 'react-icons/fa'
import '../../../styles/Global/InstallPrompt.css'

const InstallPrompt = ({ onInstall, onClose, isIOS, isAndroid, hasPrompt }) => {
  return (
    <motion.div 
      className="install-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div 
        className="install-box"
        initial={{ scale: 0.9, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 40 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-btn" onClick={onClose}>
          <FaTimes />
        </button>

        <div className="icon">
          <FaDownload />
        </div>

        <h2>Instalar App</h2>
        <p className="subtitle">
          Acesse mais rápido e sem navegador.
        </p>

        {/* BOTÃO PRINCIPAL */}
        {hasPrompt && !isIOS && (
          <button className="install-main-btn" onClick={onInstall}>
            <FaDownload /> Instalar agora
          </button>
        )}

        {/* INSTRUÇÃO CURTA */}
        {!hasPrompt && (
          <div className="hint">
            {isIOS ? (
              <>
                <FaApple /> Toque em <b>Compartilhar</b> → <b>Tela de Início</b>
              </>
            ) : (
              <>
                <FaAndroid /> Menu ⋮ → <b>Instalar app</b>
              </>
            )}
          </div>
        )}

        {/* BENEFÍCIOS SIMPLES */}
        <div className="benefits">
          <span>⚡ Rápido</span>
          <span>📱 Como app</span>
          <span>🔒 Seguro</span>
        </div>

        <button className="later-btn" onClick={onClose}>
          Agora não
        </button>
      </motion.div>
    </motion.div>
  )
}

export default InstallPrompt