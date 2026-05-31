export default function AnalysisLoader() {
  return (
    <div className="analysis-container">
      <div className="analysis-content">
        <div className="loader-wrapper">
          <div className="loader-ring">
            <div className="loader-ring-inner"></div>
          </div>
          <div className="pulse-dots">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        </div>
        <h3>Analisando imagem</h3>
        <p>Processando com inteligência artificial...</p>
        <div className="analysis-steps">
          <div className="step">
            <span className="step-icon material-symbols-outlined">filter_center_focus</span>
            <span>Pré-processamento</span>
          </div>
          <div className="step">
            <span className="step-icon material-symbols-outlined">psychology</span>
            <span>Inferência</span>
          </div>
          <div className="step">
            <span className="step-icon material-symbols-outlined">analytics</span>
            <span>Resultado final</span>
          </div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill"></div>
        </div>
      </div>

      <style jsx>{`
        .analysis-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          min-height: calc(100vh - 120px);
          background: transparent;
          cursor: default;
          user-select: none;
        }
        .analysis-content {
          background: rgba(8, 18, 13, 0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 255, 170, 0.3);
          border-radius: 36px;
          padding: 2rem 2rem 2.5rem;
          text-align: center;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 0 0 1px rgba(0, 255, 170, 0.1), 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          animation: fadeScale 0.4s ease;
        }
        @keyframes fadeScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .loader-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
        }
        .loader-ring {
          position: relative;
          width: 70px;
          height: 70px;
          margin-bottom: 1rem;
        }
        .loader-ring-inner {
          width: 100%;
          height: 100%;
          border: 3px solid transparent;
          border-top-color: #00ffaa;
          border-right-color: #00ffaa;
          border-bottom-color: #00ffaa;
          border-left-color: #00ffaa;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          position: relative;
        }
        .loader-ring-inner::before {
          content: '';
          position: absolute;
          top: -8px;
          left: -8px;
          right: -8px;
          bottom: -8px;
          border-radius: 50%;
          background: #00ffaa20;
          filter: blur(12px);
          animation: pulseGlow 1.5s infinite;
          z-index: -1;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
        .pulse-dots {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
          margin-top: 0rem;
        }
        .dot {
          width: 8px;
          height: 8px;
          background: #00ffaa;
          border-radius: 50%;
          animation: pulse 1.2s ease-in-out infinite;
        }
        .dot:nth-child(1) { animation-delay: 0s; }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .analysis-content h3 {
          font-size: 1.6rem;
          font-weight: 600;
          color: #00ffaa;
          margin: 0 0 0.5rem 0;
        }
        .analysis-content p {
          font-size: 0.9rem;
          color: #8fa3b8;
          margin-bottom: 1.5rem;
        }
        .analysis-steps {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .step {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
          min-width: 110px;
          font-size: 0.75rem;
          color: #8fa3b8;
          transition: all 0.3s;
        }
        .step-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border: 1px solid rgba(0, 255, 170, 0.22);
          border-radius: 10px;
          background: rgba(0, 255, 170, 0.08);
          font-size: 1.45rem;
          color: #00ffaa;
          line-height: 1;
          animation: stepGlow 1s ease infinite;
        }
        .step:nth-child(2) .step-icon { animation-delay: 0.33s; }
        .step:nth-child(3) .step-icon { animation-delay: 0.66s; }
        @keyframes stepGlow {
          0%, 100% { box-shadow: 0 0 0 rgba(0, 255, 170, 0); }
          50% { box-shadow: 0 0 14px rgba(0, 255, 170, 0.32); }
        }
        .progress-bar {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }
        .progress-fill {
          width: 100%;
          height: 100%;
          background: #00ffaa;
          border-radius: 4px;
          animation: loading 2s ease-in-out infinite;
        }
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
        @media (max-width: 640px) {
          .analysis-container { padding: 1rem; align-items: center; min-height: 100vh; }
          .analysis-content { padding: 1.5rem; }
          .analysis-content h3 { font-size: 1.3rem; }
          .analysis-steps { gap: 0.5rem; }
          .step { font-size: 0.65rem; min-width: 88px; }
          .step-icon { width: 34px; height: 34px; font-size: 1.25rem; }
        }
      `}</style>
    </div>
  )
}
