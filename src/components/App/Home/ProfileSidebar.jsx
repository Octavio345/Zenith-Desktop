import { useNavigate } from "react-router-dom"

const materialProfileIcons = new Set([
  "agriculture",
  "eco",
  "grass",
  "person",
  "account_circle",
  "engineering",
  "forest",
  "yard",
  "psychiatry",
  "location_on"
])

const onlyDigits = (value) => String(value || "").replace(/\D/g, "")

export default function ProfileSidebar({ userData, farmData }) {
  const navigate = useNavigate()

  const formatDocument = (doc, type) => {
    const digits = onlyDigits(doc)
    if (!digits) return "Não informado"
    if (type === "CPF" && digits.length === 11) {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
    }
    if (type === "PJ" && digits.length === 14) {
      return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
    }
    return doc
  }

  const formatPhone = (phone) => {
    const digits = onlyDigits(phone)
    if (!digits) return "Não informado"
    if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
    if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
    return phone
  }

  const getMemberTime = () => {
    if (!userData?.createdAt) return "Hoje"
    const created = new Date(userData.createdAt)
    const now = new Date()
    const diffDays = Math.ceil((now - created) / (1000 * 60 * 60 * 24))
    if (diffDays <= 1) return "1 dia"
    if (diffDays < 30) return `${diffDays} dias`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses`
    return `${Math.floor(diffDays / 365)} anos`
  }

  const renderAvatar = () => {
    const icon = userData?.profileIcon
    if (materialProfileIcons.has(icon)) {
      return <span className="material-symbols-outlined">{icon}</span>
    }

    const initials = (userData?.name || "Agricultor")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join("")
      .toUpperCase()

    return initials || <span className="material-symbols-outlined">person</span>
  }

  const goToProfile = () => {
    window.dispatchEvent(new Event("zenith:navigate"))
    setTimeout(() => navigate("/profile"), 300)
  }

  return (
    <aside className="profile-sidebar">
      <section className="profile-card home-profile-card">
        <div className="home-profile-top">
          <div className="profile-avatar-container">
            <div className="profile-avatar">{renderAvatar()}</div>
          </div>

          <div className="home-profile-heading">
            <span className="home-profile-kicker">Perfil do produtor</span>
            <h2 className="profile-title">{userData?.name || "Agricultor"}</h2>
            <div className="profile-badge-tech">
              <span className="material-symbols-outlined">verified</span>
              <span className="membro">Membro há {getMemberTime()}</span>
            </div>
          </div>
        </div>

        <div className="home-profile-info">
          <InfoItem icon="cake" label="Idade" value={userData?.age ? `${userData.age} anos` : "Não informado"} />
          <InfoItem icon="phone" label="Telefone" value={formatPhone(userData?.phone)} />
          <InfoItem icon="mail" label="Email" value={userData?.email || "Não informado"} long />
          <InfoItem
            icon="assignment_ind"
            label={userData?.type === "CPF" ? "CPF" : "CNPJ"}
            value={formatDocument(userData?.document, userData?.type)}
          />
        </div>

        <button className="edit-farm-btn home-profile-edit" onClick={goToProfile}>
          <span className="material-symbols-outlined">edit</span>
          Abrir perfil
        </button>
      </section>

      {farmData && (
        <section className="profile-card home-farm-card">
          <div className="home-card-title">
            <div className="header-icon">
              <span className="material-symbols-outlined">agriculture</span>
            </div>
            <h3>Minha Fazenda</h3>
          </div>

          <div className="home-profile-info">
            <InfoItem icon="tag" label="Nome" value={farmData.name || "Não informado"} />
            <InfoItem
              icon="location_on"
              label="Localização"
              value={farmData.municipio && farmData.uf ? `${farmData.municipio}/${farmData.uf}` : "Não informado"}
            />
            <InfoItem icon="grass" label="Plantação" value={farmData.plantacao || "Não informado"} />
            <InfoItem icon="square_foot" label="Área Total" value={farmData.area_total ? `${farmData.area_total} ha` : "Não informado"} />
          </div>
        </section>
      )}
    </aside>
  )
}

function InfoItem({ icon, label, value, long = false }) {
  return (
    <div className={`info-item-tech ${long ? "is-long" : ""}`}>
      <div className="info-label">
        <span className="material-symbols-outlined">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="info-value" title={value}>
        {value}
      </div>
    </div>
  )
}
