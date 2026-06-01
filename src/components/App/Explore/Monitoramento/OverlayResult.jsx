import { useMemo, useState } from "react"
import styles from "../../../../styles/App/MonitoramentoView.module.css"

const LEGENDA = [
  { cor: "#56a870", rotulo: "Vegetacao saudavel" },
  { cor: "#f59e0b", rotulo: "Alerta moderado" },
  { cor: "#ef4444", rotulo: "Falha critica" },
  { cor: "#3b82f6", rotulo: "Caminho ignorado" },
]

export default function OverlayResult({ originalSrc, result }) {
  const [abaAtiva, setAbaAtiva] = useState("analise")

  const overlaySrc = useMemo(() => {
    if (!result?.overlay_image) return null
    return `data:image/jpeg;base64,${result.overlay_image}`
  }, [result?.overlay_image])

  if (!result) return null

  const imagemAtual = abaAtiva === "original" || !overlaySrc
    ? originalSrc
    : overlaySrc

  return (
    <div className={styles.imagemCard}>
      <div className={styles.abas} role="tablist" aria-label="Imagem analisada">
        {[
          { id: "original", rotulo: "Original" },
          { id: "analise", rotulo: "Analise" },
        ].map(({ id, rotulo }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={abaAtiva === id}
            className={`${styles.aba} ${abaAtiva === id ? styles.aba_ativa : ""}`}
            onClick={() => setAbaAtiva(id)}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <div className={styles.imagemWrapper}>
        <img
          src={imagemAtual}
          alt={abaAtiva === "original" ? "Imagem original" : "Mapa de densidade da plantacao"}
          className={styles.imagemDisplay}
          loading="lazy"
        />
      </div>

      {abaAtiva === "analise" && (
        <div className={styles.legenda}>
          {LEGENDA.map(({ cor, rotulo }) => (
            <span key={rotulo} className={styles.legendaItem}>
              <span
                className={styles.legendaPonto}
                style={{ background: cor }}
                aria-hidden="true"
              />
              {rotulo}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
