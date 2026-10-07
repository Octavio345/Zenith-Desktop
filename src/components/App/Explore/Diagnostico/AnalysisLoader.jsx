import { useEffect, useState } from "react"
import { cropName } from "../../../../constants/diagnosisCrops"

export default function AnalysisLoader({ imageCount = 1, cultura }) {
  const [elapsed, setElapsed] = useState(0)
  const isWheat = cultura === "trigo"

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <section className="diagnosis-loading" role="status" aria-label="Análise das imagens em andamento">
      <div className="diagnosis-loading__scene" aria-hidden="true">
        <div className="diagnosis-loading__rings"><i /><i /><i /></div>
        <div className={`diagnosis-loading__crop ${isWheat ? "diagnosis-loading__crop--wheat" : ""}`}>
          {isWheat ? (
            <span className="material-symbols-outlined">grass</span>
          ) : (
            <img src="/assets/image/soja-hero-cutout.webp" alt="" />
          )}
          <span className="diagnosis-loading__scan" />
        </div>
        <span className="material-symbols-outlined diagnosis-loading__orbit diagnosis-loading__orbit--one">eco</span>
        <span className="material-symbols-outlined diagnosis-loading__orbit diagnosis-loading__orbit--two">center_focus_strong</span>
      </div>

      <div className="diagnosis-loading__copy">
        <span className="diagnosis-loading__eyebrow">LEITURA VISUAL DO LOTE</span>
        <h2>Analisando {imageCount === 1 ? "imagem" : "imagens"}</h2>
        <p>
          O modelo de {cropName(cultura).toLowerCase()} está avaliando {imageCount === 1 ? "a foto selecionada" : `as ${imageCount} fotos selecionadas`}.{" "}
          Mantenha esta página aberta até o resultado chegar.
        </p>
        <div className="diagnosis-loading__meta">
          <span><strong>Cultura</strong>{cropName(cultura)}</span>
          <span><strong>Imagens</strong>{imageCount}</span>
          <span><strong>Tempo decorrido</strong><span aria-hidden="true">{elapsed}s</span></span>
        </div>
      </div>

      <div className="diagnosis-loading__steps" aria-hidden="true">
        <div className="is-done"><span className="material-symbols-outlined">check_circle</span><strong>Fotos selecionadas</strong></div>
        <div className="is-active"><span className="material-symbols-outlined">analytics</span><strong>Análise em andamento</strong></div>
        <div><span className="material-symbols-outlined">description</span><strong>Resultado</strong></div>
      </div>

      <div className="diagnosis-loading__footer">
        <div className="diagnosis-loading__progress" aria-hidden="true"><span /></div>
        <small>A primeira análise pode levar mais tempo para carregar o modelo.</small>
      </div>
    </section>
  )
}
