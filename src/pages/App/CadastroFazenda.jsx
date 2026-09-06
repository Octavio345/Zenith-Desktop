import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db } from "../../services/firebase"
import { addDoc, collection, query, where, getDocs } from "firebase/firestore"
import CustomSelect from "../../components/App/Global/CustomSelect"
import HectareInput from "../../components/App/Global/HectareInput"
import { BRAZIL_STATE_OPTIONS } from "../../constants/brazilStates"
import { isValidHectares, parseHectaresInput, sanitizeHectaresInput } from "../../utils/hectares"
import { formatBrazilianDocument, isValidBrazilianDocument } from "../../utils/brazilianDocuments"
import { maskAccountDocument, maskAccountPhone } from "../../services/accountIdentity"
import "../../styles/App/CadastrarFazenda.css"

const OWNER_TYPES = [{ value: "PF", label: "Pessoa Física" }, { value: "PJ", label: "Pessoa Jurídica" }]
export default function CadastrarFazenda() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState("")
  const [formData, setFormData] = useState({ name: "", tipo_proprietario: "", documento_proprietario: "", data_aquisicao: "", cep: "", bairro: "", municipio: "", uf: "", area_total: "", telefone: "", plantacao: "Soja" })

  const handleChange = ({ target: { name, value } }) => {
    if (name === "tipo_proprietario") {
      setFormData((current) => ({ ...current, tipo_proprietario: value, documento_proprietario: "" }))
      setNotice("")
      return
    }
    let formatted = value
    if (name === "cep") formatted = value.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2")
    if (name === "telefone") {
      const digits = value.replace(/\D/g, "").slice(0, 11)
      formatted = digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(digits.length <= 10 ? /(\d{4})(\d)/ : /(\d{5})(\d)/, "$1-$2")
    }
    if (name === "uf") formatted = value.replace(/[^a-z]/gi, "").toUpperCase().slice(0, 2)
    if (name === "area_total") formatted = sanitizeHectaresInput(value)
    if (name === "documento_proprietario") formatted = formatBrazilianDocument(value, formData.tipo_proprietario)
    setFormData((current) => ({ ...current, [name]: formatted }))
    setNotice("")
  }

  const buscarCEP = async (cep) => {
    const digits = cep.replace(/\D/g, "")
    if (digits.length !== 8) return
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await response.json()
      if (!data.erro) setFormData((current) => ({ ...current, bairro: data.bairro || "", municipio: data.localidade || "", uf: data.uf || "" }))
    } catch { setNotice("Não foi possível consultar o CEP agora. Você pode preencher o endereço manualmente.") }
  }

  const handleRegister = async (event) => {
    event.preventDefault()
    const user = auth.currentUser
    if (!user) { navigate("/login"); return }
    if (Object.values(formData).some((value) => !String(value).trim())) { setNotice("Preencha todos os campos da propriedade para continuar."); return }
    if (!isValidHectares(formData.area_total)) { setNotice("Informe uma área total maior que zero."); return }
    if (!isValidBrazilianDocument(formData.documento_proprietario, formData.tipo_proprietario)) { setNotice(formData.tipo_proprietario === "PJ" ? "Informe um CNPJ válido." : "Informe um CPF válido."); return }
    try {
      setLoading(true)
      const existing = await getDocs(query(collection(db, "farms"), where("ownerId", "==", user.uid)))
      if (!existing.empty) { navigate("/home"); return }
      const { documento_proprietario, telefone, ...safeFarm } = formData
      await addDoc(collection(db, "farms"), { ...safeFarm, documento_proprietario_mascarado: maskAccountDocument(documento_proprietario), telefone_mascarado: maskAccountPhone(telefone), area_total: parseHectaresInput(formData.area_total), ownerId: user.uid, createdAt: new Date().toISOString() })
      navigate("/home")
    } catch (error) { console.error(error); setNotice("Não foi possível salvar a fazenda. Revise os dados e tente novamente.") } finally { setLoading(false) }
  }

  return (
    <main className="farm-registration">
      <section className="farm-registration__intro">
        <button className="farm-registration__brand" type="button" onClick={() => navigate("/home")}>
          <img src="/assets/image/Logo.png" alt="Zenith" />
          <span><strong>Zenith</strong><small>Sua precisão agrícola no ponto mais alto</small></span>
        </button>
        <div className="farm-registration__intro-copy">
          <span className="farm-registration__eyebrow"><i /> CONFIGURAÇÃO INICIAL</span>
          <h1>Vamos conectar<br /><em>sua fazenda.</em></h1>
          <p>Com esses dados, preparamos o clima, o monitoramento e a visão operacional da sua propriedade.</p>
          <ul>
            <li><span className="material-symbols-outlined">location_on</span> Localização automática pelo CEP</li>
            <li><span className="material-symbols-outlined">agriculture</span> Dados organizados para a sua operação</li>
            <li><span className="material-symbols-outlined">shield</span> Informações protegidas na sua conta</li>
          </ul>
        </div>
      </section>
      <section className="farm-registration__form-area">
        <div className="farm-registration__form-head"><button type="button" onClick={() => navigate("/home")}><span className="material-symbols-outlined">arrow_back</span> Voltar ao painel</button><span>ETAPA 1 DE 1</span></div>
        <form className="farm-registration__card" onSubmit={handleRegister}>
          <div className="farm-registration__card-title"><span className="material-symbols-outlined">agriculture</span><div><h2>Cadastre sua fazenda</h2><p>Informe os dados principais da propriedade.</p></div></div>
          <div className="farm-registration__fields">
            <label className="farm-field farm-field--full"><span>Nome da fazenda</span><input name="name" value={formData.name} onChange={handleChange} placeholder="Ex.: Fazenda Boa Vista" /></label>
            <label className="farm-field"><span>Tipo de proprietário</span><CustomSelect name="tipo_proprietario" value={formData.tipo_proprietario} onChange={handleChange} options={OWNER_TYPES} placeholder="Selecione" /></label>
            {formData.tipo_proprietario && <label className="farm-field"><span>{formData.tipo_proprietario === "PJ" ? "CNPJ" : "CPF"}</span><input name="documento_proprietario" value={formData.documento_proprietario} onChange={handleChange} inputMode="numeric" maxLength={formData.tipo_proprietario === "PJ" ? 18 : 14} placeholder={formData.tipo_proprietario === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"} /></label>}
            <label className="farm-field"><span>Data de aquisição</span><input type="date" name="data_aquisicao" value={formData.data_aquisicao} onChange={handleChange} /></label>
            <label className="farm-field"><span>CEP</span><input name="cep" value={formData.cep} onChange={(event) => { handleChange(event); buscarCEP(event.target.value) }} placeholder="00000-000" /></label>
            <label className="farm-field"><span>UF</span><CustomSelect name="uf" value={formData.uf} onChange={handleChange} options={BRAZIL_STATE_OPTIONS} placeholder="Selecione a UF" /></label>
            <label className="farm-field"><span>Bairro</span><input name="bairro" value={formData.bairro} onChange={handleChange} placeholder="Bairro ou distrito" /></label>
            <label className="farm-field"><span>Município</span><input name="municipio" value={formData.municipio} onChange={handleChange} placeholder="Cidade" /></label>
            <label className="farm-field"><span>Área total</span><HectareInput name="area_total" value={formData.area_total} onChange={handleChange} placeholder="Ex.: 125,5" /></label>
            <label className="farm-field"><span>Telefone</span><input type="tel" inputMode="numeric" maxLength={15} name="telefone" value={formData.telefone} onChange={handleChange} placeholder="(00) 00000-0000" /></label>
          </div>
          {notice && <p className="farm-registration__notice">{notice}</p>}
          <button className="farm-registration__submit" type="submit" disabled={loading}>{loading ? "Salvando dados..." : <>Concluir cadastro <span className="material-symbols-outlined">arrow_forward</span></>}</button>
        </form>
      </section>
    </main>
  )
}
