// components/App/Global/InstallSuccess.jsx
import { motion } from "framer-motion"
import { FaCheckCircle, FaRocket, FaTimes } from 'react-icons/fa'
import '../../../styles/Global/InstallSuccess.css'

const InstallSuccess = ({ onClose, isIOS, isAndroid }) => {
  return (
    <motion.div 
      className="install-success-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div 
        className="install-success"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="install-success-close" onClick={onClose}>
          <FaTimes />
        </button>

        <div className="success-icon">
          <FaCheckCircle size={64} color="#16f29a" />
        </div>

        <h2>Instalado com sucesso! 🎉</h2>

        <div className="success-message">
          <FaRocket size={20} />
          <p>O AgroVoo foi instalado no seu dispositivo!</p>
        </div>

        <div className="next-steps">
          <h3>Próximos passos:</h3>
          <ol>
            {isAndroid && (
              <>
                <li>Feche esta aba do navegador</li>
                <li>Procure o ícone do <strong>AgroVoo</strong> na sua área de trabalho</li>
                <li>Toque no ícone para abrir o app fora do navegador!</li>
              </>
            )}
            {isIOS && (
              <>
                <li>Volte para a tela inicial do seu iPhone/iPad</li>
                <li>Procure o ícone do <strong>AgroVoo</strong></li>
                <li>Toque para abrir como um app nativo!</li>
              </>
            )}
            {!isIOS && !isAndroid && (
              <>
                <li>Feche esta aba do navegador</li>
                <li>Procure o atalho do <strong>AgroVoo</strong> na sua área de trabalho</li>
                <li>Clique para abrir como um app!</li>
              </>
            )}
          </ol>
        </div>

        <button className="success-button" onClick={onClose}>
          Entendi!
        </button>
      </motion.div>
    </motion.div>
  )
}

export default InstallSuccess