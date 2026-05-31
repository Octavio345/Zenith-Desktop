import { useState } from "react"
import { motion } from "framer-motion"
import CustomSelect from "../Global/CustomSelect"

const onlyDigits = (value) => String(value || "").replace(/\D/g, "")

const formatPhoneInput = (value) => {
  const digits = onlyDigits(value).slice(0, 11)
  if (!digits) return ""
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

const ufList = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
]

const culturaList = [
  "Soja", "Milho", "Cafe", "Cana-de-acucar", "Algodao",
  "Trigo", "Arroz", "Feijao", "Pastagem", "Eucalipto",
  "Laranja", "Outros"
]

const culturaOptions = [
  { value: "", label: "Selecione" },
  ...culturaList.map(cultura => ({ value: cultura, label: cultura }))
]

const ufOptions = [
  { value: "", label: "Selecione" },
  ...ufList.map(uf => ({ value: uf, label: uf }))
]

const tipoProprietarioOptions = [
  { value: "Proprietario", label: "Proprietario" },
  { value: "Arrendatario", label: "Arrendatario" },
  { value: "Parceiro", label: "Parceiro" },
  { value: "Comodatario", label: "Comodatario" },
  { value: "Outros", label: "Outros" }
]

const fetchAddressByCep = async (cep) => {
  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
  if (!response.ok) throw new Error("CEP indisponivel")
  const data = await response.json()
  if (data.erro) throw new Error("CEP nao encontrado")
  return data
}

const FarmEditForm = ({ farmData, onSave, onCancel, saving }) => {
  const [formData, setFormData] = useState({
    name: farmData?.name || "",
    area_total: farmData?.area_total || "",
    plantacao: farmData?.plantacao || "",
    municipio: farmData?.municipio || "",
    uf: farmData?.uf || "",
    bairro: farmData?.bairro || "",
    cep: farmData?.cep || "",
    data_aquisicao: farmData?.data_aquisicao || "",
    telefone: formatPhoneInput(farmData?.telefone || ""),
    tipo_proprietario: farmData?.tipo_proprietario || "Proprietario"
  })

  const [errors, setErrors] = useState({})
  const [cepStatus, setCepStatus] = useState("")

  const handleChange = (e) => {
    const { name, value } = e.target
    let nextValue = value

    if (name === "telefone") nextValue = formatPhoneInput(value)
    if (name === "cep") nextValue = onlyDigits(value).slice(0, 8)
    if (name === "uf") nextValue = value.toUpperCase().slice(0, 2)

    setFormData(prev => ({ ...prev, [name]: nextValue }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }))
  }

  const handleCepBlur = async () => {
    const cep = onlyDigits(formData.cep)
    if (cep.length !== 8) {
      setCepStatus("")
      return
    }

    setCepStatus("Buscando cidade e UF...")
    try {
      const address = await fetchAddressByCep(cep)
      setFormData(prev => ({
        ...prev,
        municipio: address.localidade || prev.municipio,
        uf: address.uf || prev.uf,
        bairro: address.bairro || prev.bairro
      }))
      setCepStatus("Cidade e UF preenchidos pelo CEP.")
      setErrors(prev => ({ ...prev, municipio: "", uf: "" }))
    } catch {
      setCepStatus("CEP nao encontrado. Preencha cidade e UF manualmente.")
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) newErrors.name = "Nome da fazenda e obrigatorio"

    if (!formData.area_total) {
      newErrors.area_total = "Area total e obrigatoria"
    } else if (isNaN(formData.area_total) || parseFloat(formData.area_total) <= 0) {
      newErrors.area_total = "Area deve ser um numero positivo"
    }

    if (!formData.municipio.trim()) newErrors.municipio = "Municipio e obrigatorio"
    if (!formData.uf.trim()) newErrors.uf = "UF e obrigatoria"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validateForm()) onSave(formData)
  }

  return (
    <motion.div
      className="profile-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="card-header">
        <div className="header-icon">
          <span className="material-symbols-outlined">agriculture</span>
        </div>
        <h3>Editar informacoes da fazenda</h3>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-fields">
          <div className="input-group">
            <label className="input-label">Nome da Fazenda</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`tech-input ${errors.name ? "error" : ""}`}
              disabled={saving}
            />
          </div>
          {errors.name && <span className="error-message">{errors.name}</span>}

          <div className="input-row-tech">
            <div className="input-group">
              <label className="input-label">Area total (ha)</label>
              <input
                type="number"
                name="area_total"
                value={formData.area_total}
                onChange={handleChange}
                className={`tech-input ${errors.area_total ? "error" : ""}`}
                step="0.1"
                min="0"
                disabled={saving}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Cultura</label>
              <CustomSelect
                name="plantacao"
                value={formData.plantacao}
                onChange={handleChange}
                className="tech-select"
                disabled={saving}
                options={culturaOptions}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">CEP opcional</label>
            <input
              type="text"
              name="cep"
              value={formData.cep}
              onChange={handleChange}
              onBlur={handleCepBlur}
              className="tech-input"
              inputMode="numeric"
              maxLength="8"
              placeholder="Digite o CEP para preencher cidade e UF"
              disabled={saving}
            />
            {cepStatus && <span className="field-hint">{cepStatus}</span>}
          </div>

          <div className="input-row-tech">
            <div className="input-group">
              <label className="input-label">Municipio</label>
              <input
                type="text"
                name="municipio"
                value={formData.municipio}
                onChange={handleChange}
                className={`tech-input ${errors.municipio ? "error" : ""}`}
                disabled={saving}
              />
            </div>

            <div className="input-group">
              <label className="input-label">UF</label>
              <CustomSelect
                name="uf"
                value={formData.uf}
                onChange={handleChange}
                className={`tech-select ${errors.uf ? "error" : ""}`}
                disabled={saving}
                options={ufOptions}
              />
            </div>
          </div>

          <div className="input-row-tech">
            <div className="input-group">
              <label className="input-label">Bairro</label>
              <input
                type="text"
                name="bairro"
                value={formData.bairro}
                onChange={handleChange}
                className="tech-input"
                disabled={saving}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Data de aquisicao</label>
              <input
                type="date"
                name="data_aquisicao"
                value={formData.data_aquisicao}
                onChange={handleChange}
                className="tech-input"
                disabled={saving}
              />
            </div>
          </div>

          <div className="input-row-tech">
            <div className="input-group">
              <label className="input-label">Telefone da fazenda</label>
              <input
                type="tel"
                name="telefone"
                value={formData.telefone}
                onChange={handleChange}
                className="tech-input"
                inputMode="numeric"
                maxLength="15"
                placeholder="(19) 99999-9999"
                disabled={saving}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Tipo de proprietario</label>
              <CustomSelect
                name="tipo_proprietario"
                value={formData.tipo_proprietario}
                onChange={handleChange}
                className="tech-select"
                disabled={saving}
                options={tipoProprietarioOptions}
              />
            </div>
          </div>

          <div className="edit-form-actions">
            <button type="button" onClick={onCancel} className="cancel-btn">
              Cancelar
            </button>

            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? "Salvando..." : "Salvar alteracoes"}
            </button>
          </div>
        </div>
      </form>
    </motion.div>
  )
}

export default FarmEditForm
