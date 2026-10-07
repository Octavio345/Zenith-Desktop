import "../../../../styles/App/CropSelector.css"
import { DIAGNOSIS_CROPS } from "../../../../constants/diagnosisCrops"

export default function CropSelector({ value, onChange, compact = false }) {
  return (
    <fieldset className={`diagnosis-crop-selector ${compact ? "diagnosis-crop-selector--compact" : ""}`}>
      <legend>Cultura das imagens</legend>
      <p>Selecione a cultura antes de enviar as fotos. Use um lote por cultura e por talhão.</p>
      <div className="diagnosis-crop-options">
        {DIAGNOSIS_CROPS.map((crop) => (
          <label className={`diagnosis-crop-option ${value === crop.code ? "is-selected" : ""}`} key={crop.code}>
            <input
              type="radio"
              name="diagnosis-crop"
              value={crop.code}
              checked={value === crop.code}
              onChange={() => onChange(crop.code)}
            />
            <span className="material-symbols-outlined" aria-hidden="true">{crop.icon}</span>
            <span className="diagnosis-crop-option__copy">
              <strong>{crop.name}</strong>
              <small>{crop.description}</small>
            </span>
            <span className="material-symbols-outlined diagnosis-crop-option__check" aria-hidden="true">check_circle</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
