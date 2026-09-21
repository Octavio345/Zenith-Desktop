import { useEffect } from "react"
import { getAppSystemCopy } from "../../../constants/appLanguages"
import "../../../styles/Global/SplashScreen.css"

export default function SplashScreen({ onComplete, message }) {
  const resolvedMessage = message || `${getAppSystemCopy().loading}...`
  useEffect(() => {
    const timeout = setTimeout(() => onComplete?.(), 180)

    return () => clearTimeout(timeout)
  }, [onComplete])

  return (
    <div className="splash">
      <div className="splash-mark" aria-hidden="true">
        <span className="material-symbols-outlined splash-icon notranslate" translate="no">eco</span>
        <span className="splash-ring" />
      </div>

      <div className="splash-copy">
        <strong className="notranslate" translate="no">Zenith</strong>
        <p className="notranslate" translate="no">{resolvedMessage}</p>
      </div>

      <div className="splash-progress" aria-hidden="true"><span /></div>
    </div>
  )
}
