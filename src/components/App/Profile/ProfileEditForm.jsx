import CustomSelect from "../Global/CustomSelect"

const profileIcons = [
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
]

export default function ProfileEditForm({ formData, onChange, onIconSelect, onSave, onCancel, saving }) {
  return (
    <div className="profile-card glass edit-card">
      <div className="card-header">
        <div className="header-icon">
          <span className="material-symbols-outlined">edit</span>
        </div>
        <h3>Editar perfil</h3>
      </div>

      <div className="card-content">
        <div className="icon-selector-tech">
          <label>
            <span className="material-symbols-outlined">account_circle</span>
            Ícone do perfil
          </label>
          <div className="icon-grid-tech">
            {profileIcons.map((icon) => (
              <button
                key={icon}
                className={`icon-option-tech ${formData.profileIcon === icon ? "selected" : ""}`}
                onClick={() => onIconSelect(icon)}
                type="button"
              >
                <span className="material-symbols-outlined">{icon}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-fields">
          <div className="input-group">
            <label className="input-label">Nome completo</label>
            <input className="tech-input" name="name" value={formData.name} placeholder="Nome completo" onChange={onChange} />
          </div>

          <div className="input-row-tech">
            <div className="input-group">
              <label className="input-label">Idade</label>
              <input className="tech-input" type="number" name="age" value={formData.age} placeholder="Idade" min="0" max="120" onChange={onChange} />
            </div>
            <div className="input-group">
              <label className="input-label">Telefone</label>
              <input
                className="tech-input"
                type="tel"
                inputMode="numeric"
                name="phone"
                value={formData.phone}
                placeholder="(19) 99999-9999"
                maxLength="15"
                onChange={onChange}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Email</label>
            <input className="tech-input" name="email" value={formData.email} placeholder="Email" disabled />
          </div>

          <div className="input-row-tech">
            <div className="input-group">
              <label className="input-label">Tipo de proprietário</label>
              <CustomSelect
                className="tech-select"
                name="type"
                value={formData.type}
                onChange={onChange}
                options={[
                  { value: "", label: "Selecione" },
                  { value: "CPF", label: "Pessoa Física (CPF)" },
                  { value: "PJ", label: "Pessoa Jurídica (CNPJ)" }
                ]}
              />
            </div>
            <div className="input-group">
              <label className="input-label">{formData.type === "PJ" ? "CNPJ" : "CPF/CNPJ"}</label>
              <input
                className="tech-input"
                name="document"
                value={formData.document}
                placeholder={formData.type === "PJ" ? "CNPJ" : "CPF"}
                maxLength={formData.type === "PJ" ? 14 : 11}
                onChange={onChange}
              />
            </div>
          </div>
        </div>

        <div className="info-note">
          <span className="material-symbols-outlined">info</span>
          <p>Essas informações ajudam a preencher dados padrão da propriedade e relatórios futuros.</p>
        </div>

        <div className="edit-form-actions profile-edit-footer-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>
            Cancelar
          </button>

          <button type="button" className="save-btn" onClick={onSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </div>
    </div>
  )
}
