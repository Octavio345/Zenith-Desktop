const onlyDigits = (value) => String(value || "").replace(/\D/g, "")

function formatCep(value) {
  const digits = onlyDigits(value)
  if (digits.length !== 8) return value || "Não informado"
  return digits.replace(/^(\d{5})(\d{3})$/, "$1-$2")
}

function formatArea(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return "Não informado"
  return `${number.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ha`
}

export default function FarmInfoCard({ farmData }) {
  if (!farmData) return null

  const location = [farmData.municipio, farmData.uf].filter(Boolean).join(" / ")

  return (
    <div className="farm-info-card glass">
      <div className="farm-info-content">
        <div className="farm-icon">
          <span className="material-symbols-outlined">agriculture</span>
          <div className="icon-glow"></div>
        </div>

        <div className="farm-details">
          <span className="farm-card-kicker">Fazenda principal</span>
          <h3 className="farm-name">{farmData.name || "Minha fazenda"}</h3>

          <div className="farm-location">
            <span className="material-symbols-outlined">location_on</span>
            <span>{location || "Localização não informada"}</span>
            {farmData.cep && <span className="farm-sector">{formatCep(farmData.cep)}</span>}
          </div>
        </div>
      </div>

      <div className="farm-stats">
        <div className="stat-item">
          <span className="stat-label">Área Total</span>
          <span className="stat-value-teste">{formatArea(farmData.area_total)}</span>
        </div>

        <div className="stat-divider"></div>

        <div className="stat-item">
          <span className="stat-label">Plantação</span>
          <span className="stat-value-teste">{farmData.plantacao || "Não informado"}</span>
        </div>

        <div className="stat-divider"></div>

        <div className="stat-item">
          <span className="stat-label">CEP</span>
          <span className="stat-value-teste">{formatCep(farmData.cep)}</span>
        </div>
      </div>
    </div>
  )
}
