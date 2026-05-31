import { useEffect } from "react"
import "../../../styles/Global/SplashScreen.css"

export default function SplashScreen({ onComplete, message = "Carregando Zenith..." }) {
  useEffect(() => {
    const timeout = setTimeout(() => {
      onComplete?.()
    }, 650)

    return () => clearTimeout(timeout)
  }, [onComplete])

  return (
    <div className="splash">
      <div className="splash-orbit" aria-hidden="true">
        <span className="material-symbols-outlined splash-icon">agriculture</span>
        <span className="splash-node node-a"></span>
        <span className="splash-node node-b"></span>
        <span className="splash-node node-c"></span>
      </div>

      <div className="splash-copy">
        <strong>ZENITH</strong>
        <p>{message}</p>
      </div>

      <div className="splash-progress" aria-hidden="true">
        <span></span>
      </div>
    </div>
  )
}
