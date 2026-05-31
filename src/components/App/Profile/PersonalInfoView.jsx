// components/Profile/PersonalInfoView.jsx
const formatPhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "")
  if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
  if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
  return phone || "Não informado"
}

export default function PersonalInfoView({ userData, user, formatDocument }) {
  const infoItems = [
    { icon: "badge", label: "Nome", value: userData?.name || "Não informado" },
    { icon: "cake", label: "Idade", value: userData?.age ? `${userData.age} anos` : "Não informado" },
    { icon: "call", label: "Telefone", value: formatPhone(userData?.phone) },
    { icon: "mail", label: "Email", value: user?.email, badge: true },
    { 
      icon: "assignment_ind", 
      label: userData?.type === "CPF" ? "CPF" : "CNPJ", 
      value: userData?.document ? formatDocument(userData.document) : null,
      show: userData?.document
    }
  ]

  return (
    <div className="profile-card glass">
      <div className="card-corner"></div>
      <div className="card-header">
        <div className="header-icon">
          <span className="material-symbols-outlined">person</span>
          <div className="icon-glow"></div>
        </div>
        <h3>Informações Pessoais</h3>
        <div className="header-line"></div>
      </div>
      
      <div className="card-content">
        {infoItems.map((item, index) => (
          item.value && (
            <div key={index} className="info-item-tech">
              <div className="info-label">
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </div>
              <div className={`info-value ${item.badge ? 'badge' : ''}`}>
                {item.value}
                <div className="value-glow"></div>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  )
}
