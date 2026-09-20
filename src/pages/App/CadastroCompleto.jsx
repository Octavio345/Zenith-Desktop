import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db } from "../../services/firebase"
import { createUserWithEmailAndPassword, deleteUser } from "firebase/auth"
import { doc, setDoc, addDoc, collection } from "firebase/firestore"
import { ACCOUNT_ROLES } from "../../services/accessControl"
import { accountIdentifierMessage, createProfileWithUniqueIdentifiers, maskAccountDocument } from "../../services/accountIdentity"
import CustomSelect from "../../components/App/Global/CustomSelect"
import HectareInput from "../../components/App/Global/HectareInput"
import { BRAZIL_STATE_OPTIONS, BRAZIL_STATE_SET } from "../../constants/brazilStates"
import { isValidHectares, parseHectaresInput, sanitizeHectaresInput } from "../../utils/hectares"
import "../../styles/App/CadastroCompleto.css"

const PERSON_TYPE_OPTIONS = [
  { value: "CPF", label: "Pessoa Física (CPF)" },
  { value: "PJ", label: "Pessoa Jurídica (CNPJ)" },
]

const PLAN_OPTIONS = [
  {
    id: "agro-vision",
    name: "Agro Vision",
    badge: "Ate 50 ha",
    price: "R$ 799/anual",
    features: [
      "Monitoramento de ate 50 ha",
      "Relatorios mensais com IA",
      "Suporte por e-mail",
      "Deteccao da plantacao",
    ],
  },
  {
    id: "agro-imperial",
    name: "Agro Imperial",
    badge: "Profissional",
    price: "R$ 1200/anual",
    features: [
      "Monitoramento de ate 200 ha",
      "Relatorios semanais com IA",
      "Suporte prioritario 24/7",
      "Consultoria especializada",
    ],
  },
  {
    id: "agro-enterprise",
    name: "Agro Enterprise",
    badge: "Empresarial",
    price: "Sob consulta",
    features: [
      "Monitoramento ilimitado",
      "Relatorios em tempo real",
      "API de integracao",
      "Gestor de conta exclusivo",
    ],
  },
]

const PLAN_NOTICE = "Valores simbólicos para demonstração acadêmica. Nenhuma cobrança real é realizada."

const formatCEP = (value) => value.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2")
const formatPhone = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 11)
  return digits.length <= 10
    ? digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2")
    : digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2")
}
const hasMinLetters = (value, count) => (value.match(/[a-zA-ZÀ-ÿ]/g) || []).length >= count
const normalizeText = (value) => value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").toLowerCase()
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) && !value.includes("..")
const isValidCPF = (digits) => {
  return /^\d{11}$/.test(digits)
}
const isValidCNPJ = (digits) => {
  return /^\d{14}$/.test(digits)
}
const isValidPhone = (digits) => /^\d{10,11}$/.test(digits)
const getPasswordError = (password) => {
  const isValid = password.length >= 8
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /\d/.test(password)
    && /[!@#$%^&*()_+\-={}\[\]:;<>?,./]/.test(password)
    && !/\s/.test(password)
  return isValid
    ? ""
    : "A senha precisa ter pelo menos 8 caracteres, uma letra maiúscula, uma letra minúscula, um número e um caractere especial, sem espaços."
}

export default function CadastroCompleto() {
  const navigate = useNavigate()
  const [etapa, setEtapa] = useState(1)
  const [loading, setLoading] = useState(false)
  const [cepData, setCepData] = useState(null)
  const [alertMessage, setAlertMessage] = useState({ type: "", text: "" })
  const [userId, setUserId] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [demoDocumentAcknowledgements, setDemoDocumentAcknowledgements] = useState({ personal: false, phone: false, farm: false })

  const [userData, setUserData] = useState({
    name: "", age: "", type: "", document: "", phone: "", email: "", password: "", confirmPassword: "", plan: "agro-vision"
  })
  const [farmData, setFarmData] = useState({
    name: "", tipo_proprietario: "PJ", documento_proprietario: "", data_aquisicao: "", cep: "",
    bairro: "", municipio: "", uf: "", area_total: "", plantacao: "Soja"
  })

  const buscarCEP = async (cep) => {
    const cepLimpo = cep.replace(/\D/g, "")
    if (cepLimpo.length !== 8) return
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setCepData(data)
        setFarmData((prev) => ({
          ...prev,
          bairro: data.bairro || "",
          municipio: data.localidade || "",
          uf: data.uf || ""
        }))
      } else setCepData(null)
    } catch (e) { console.error(e) }
  }

  const handleUserChange = (e) => {
    const { name, value } = e.target
    let formatted = value
    if (name === "name") formatted = value.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, "").replace(/\s+/g, " ").slice(0, 80)
    if (name === "age") formatted = value.replace(/\D/g, "").slice(0, 3)
    if (name === "email") formatted = value.trim().toLowerCase().slice(0, 120)
    if (name === "phone") formatted = formatPhone(value)
    if (name === "password" || name === "confirmPassword") formatted = value.slice(0, 64)
    setUserData({ ...userData, [name]: formatted, ...(name === "type" ? { document: "" } : {}) })
    if (name === "type" || name === "document") {
      setDemoDocumentAcknowledgements((current) => ({ ...current, personal: false }))
    }
    if (name === "phone") {
      setDemoDocumentAcknowledgements((current) => ({ ...current, phone: false }))
    }
    setAlertMessage({ type: "", text: "" })
  }
  const handleFarmChange = (e) => {
    const { name, value } = e.target
    let formatted = value
    if (name === "name") formatted = value.replace(/\s+/g, " ").slice(0, 80)
    if (name === "cep") { formatted = formatCEP(value); setCepData(null) }
    if (name === "uf") formatted = value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2)
    if (name === "bairro" || name === "municipio") formatted = value.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, "").replace(/\s+/g, " ").slice(0, 80)
    if (name === "area_total") formatted = sanitizeHectaresInput(value)
    if (name === "documento_proprietario") formatted = formatDocument(value, "PJ")
    setFarmData({ ...farmData, [name]: formatted })
    if (name === "documento_proprietario") {
      setDemoDocumentAcknowledgements((current) => ({ ...current, farm: false }))
    }
    setAlertMessage({ type: "", text: "" })
  }

  const validateUserData = () => {
    if (!userData.name || !userData.age || !userData.type || !userData.document || !userData.phone || !userData.email || !userData.password || !userData.confirmPassword || !userData.plan) {
      setAlertMessage({ type: "error", text: "Preencha todos os dados obrigatórios." })
      return false
    }
    if (!hasMinLetters(userData.name, 3)) {
      setAlertMessage({ type: "error", text: "Informe um nome completo válido." })
      return false
    }
    const age = Number(userData.age)
    if (!Number.isInteger(age) || age < 18 || age > 120) {
      setAlertMessage({ type: "error", text: "Informe uma idade válida entre 18 e 120 anos." })
      return false
    }
    const documentDigits = userData.document.replace(/\D/g, "")
    if (userData.type === "CPF" && !isValidCPF(documentDigits)) {
      setAlertMessage({ type: "error", text: "Informe um CPF fictício com 11 dígitos." })
      return false
    }
    if (userData.type === "PJ" && !isValidCNPJ(documentDigits)) {
      setAlertMessage({ type: "error", text: "Informe um CNPJ fictício com 14 dígitos." })
      return false
    }
    if (!isValidEmail(userData.email)) {
      setAlertMessage({ type: "error", text: "Informe um email válido." })
      return false
    }
    if (!isValidPhone(userData.phone.replace(/\D/g, ""))) {
      setAlertMessage({ type: "error", text: "Informe um telefone fictício válido com DDD." })
      return false
    }
    const passwordError = getPasswordError(userData.password)
    if (passwordError) {
      setAlertMessage({ type: "error", text: passwordError })
      return false
    }
    if (userData.password !== userData.confirmPassword) {
      setAlertMessage({ type: "error", text: "As senhas não coincidem. Confira e tente novamente." })
      return false
    }
    if (!demoDocumentAcknowledgements.personal) {
      setAlertMessage({ type: "error", text: "Use um CPF ou CNPJ fictício e confirme a opção de demonstração." })
      return false
    }
    if (!demoDocumentAcknowledgements.phone) {
      setAlertMessage({ type: "error", text: "Use um telefone fictício e confirme a opção de demonstração." })
      return false
    }
    return true
  }
  const validateFarmData = async () => {
    const f = farmData
    if (!f.name || !f.tipo_proprietario || !f.documento_proprietario || !f.data_aquisicao || !f.cep || !f.bairro || !f.municipio || !f.uf || !f.area_total || !f.plantacao) {
      setAlertMessage({ type: "error", text: "Preencha todos os dados da fazenda." })
      return false
    }
    if (!isValidHectares(f.area_total)) { setAlertMessage({ type: "error", text: "Informe uma área total maior que zero." }); return false }
    const ownerDocument = f.documento_proprietario.replace(/\D/g, "")
    if (!isValidCNPJ(ownerDocument)) { setAlertMessage({ type: "error", text: "Informe um CNPJ rural fictício com 14 dígitos." }); return false }
    if (!demoDocumentAcknowledgements.farm) { setAlertMessage({ type: "error", text: "Use um CNPJ rural fictício e confirme a opção de demonstração." }); return false }
    if (!hasMinLetters(f.name, 3)) { setAlertMessage({ type: "error", text: "Informe um nome de fazenda válido." }); return false }
    const cepDigits = f.cep.replace(/\D/g, "")
    if (cepDigits.length !== 8) { setAlertMessage({ type: "error", text: "Informe um CEP válido com 8 dígitos." }); return false }
    let validCEP = cepData
    if (!validCEP || validCEP.cep?.replace(/\D/g, "") !== cepDigits) {
      try { const response = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`); const data = await response.json(); validCEP = response.ok && !data.erro ? data : null; if (validCEP) setCepData(validCEP) } catch { validCEP = null }
    }
    if (!validCEP) { setAlertMessage({ type: "error", text: "CEP não encontrado. Confira o número informado." }); return false }
    if (!BRAZIL_STATE_SET.has(f.uf) || (validCEP.uf && f.uf !== validCEP.uf)) { setAlertMessage({ type: "error", text: validCEP.uf ? `A UF correspondente a esse CEP é ${validCEP.uf}.` : "Informe uma UF válida." }); return false }
    if (!hasMinLetters(f.bairro, 2) || (validCEP.bairro && normalizeText(f.bairro) !== normalizeText(validCEP.bairro))) { setAlertMessage({ type: "error", text: validCEP.bairro ? `O bairro correspondente a esse CEP é ${validCEP.bairro}.` : "Informe um bairro válido." }); return false }
    if (!hasMinLetters(f.municipio, 2) || (validCEP.localidade && normalizeText(f.municipio) !== normalizeText(validCEP.localidade))) { setAlertMessage({ type: "error", text: validCEP.localidade ? `O município correspondente a esse CEP é ${validCEP.localidade}.` : "Informe um município válido." }); return false }
    return true
  }

  const handleCreateUser = async () => {
    if (!validateUserData()) return
    setLoading(true)
    let createdUser = null
    try {
      const userCred = await createUserWithEmailAndPassword(auth, userData.email, userData.password)
      createdUser = userCred.user
      const selectedPlan = PLAN_OPTIONS.find((plan) => plan.id === userData.plan) || PLAN_OPTIONS[0]
      await createProfileWithUniqueIdentifiers({ profileCollection: "owners", userId: userCred.user.uid, profileData: {
        name: userData.name,
        age: parseInt(userData.age),
        type: userData.type,
        document: userData.document.replace(/\D/g, ""),
        phone: userData.phone.replace(/\D/g, ""),
        email: userData.email,
        role: ACCOUNT_ROLES.ADMIN,
        plan: selectedPlan.id,
        planName: selectedPlan.name,
        hectares: 0,
        createdAt: new Date().toISOString(),
        profileIcon: "agriculture"
      } })

      localStorage.setItem("zenithAccessType", "owner")
      setUserId(userCred.user.uid)
      setEtapa(2)
      setAlertMessage({
        type: "success",
        text: "Conta criada com sucesso. Agora cadastre sua fazenda.",
      })
    } catch (error) {
      if (createdUser && auth.currentUser?.uid === createdUser.uid) {
        try { await deleteUser(createdUser) } catch {   }
      }
      let msg = accountIdentifierMessage(error) || "Erro no cadastro. Tente novamente."
      setAlertMessage({ type: "error", text: msg })
    } finally { setLoading(false) }
  }

  const handleSaveFarm = async () => {
    if (!(await validateFarmData())) return
    setLoading(true)
    try {
      await addDoc(collection(db, "farms"), {
        name: farmData.name,
        tipo_proprietario: farmData.tipo_proprietario,
        documento_proprietario_mascarado: maskAccountDocument(farmData.documento_proprietario),
        data_aquisicao: farmData.data_aquisicao,
        cep: farmData.cep,
        bairro: farmData.bairro,
        municipio: farmData.municipio,
        uf: farmData.uf,
        plantacao: farmData.plantacao,
        area_total: parseHectaresInput(farmData.area_total),
        ownerId: userId,
        ownerName: userData.name,
        createdAt: new Date()
      })
      await setDoc(doc(db, "owners", userId), { hectares: parseHectaresInput(farmData.area_total) }, { merge: true })
      navigate("/home", { replace: true })
    } catch (error) {
      console.error(error)
      setAlertMessage({ type: "error", text: accountIdentifierMessage(error) || "Erro ao cadastrar fazenda." })
    } finally { setLoading(false) }
  }

  const formatDocument = (value, type) => {
    const n = value.replace(/\D/g, "")
    if (type === "CPF") {
      return n.slice(0,11)
        .replace(/(\d{3})(\d)/,"$1.$2")
        .replace(/(\d{3})(\d)/,"$1.$2")
        .replace(/(\d{3})(\d{1,2})$/,"$1-$2")
    }
    return n.slice(0,14)
      .replace(/^(\d{2})(\d)/,"$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/,"$1.$2.$3")
      .replace(/\.(\d{3})(\d)/,".$1/$2")
      .replace(/(\d{4})(\d)/,"$1-$2")
  }

  return (
    <div className="cc-shell">
      <div className="cc-bg-grid" />
      <div className="cc-bg-sphere cc-bg-sphere-1" />
      <div className="cc-bg-sphere cc-bg-sphere-2" />

      <div className="cc-wrap">
        <header className="cc-top">
          <div className="cc-brand">
            <img src="/assets/image/Logo-redonda.webp" alt="" />
            <span><strong>Zenith</strong><small>Sua precisão agrícola no ponto mais alto</small></span>
          </div>
          {etapa === 1 && (
            <button className="cc-back-login" type="button" onClick={() => navigate("/login")}>
              <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
              <span>Voltar para o login</span>
            </button>
          )}
        </header>

        <div className="cc-stepper">
          <div className={`cc-step ${etapa >= 1 ? "active" : ""} ${etapa > 1 ? "done" : ""}`}>
            <span>{etapa > 1 ? "✓" : "01"}</span>
            <div>
              <strong>Dados do produtor</strong>
              <small>Informações pessoais</small>
            </div>
          </div>
          <div className="cc-step-line" />
          <div className={`cc-step ${etapa === 2 ? "active" : ""}`}>
            <span>02</span>
            <div>
              <strong>Dados da fazenda</strong>
              <small>Propriedade e operação</small>
            </div>
          </div>
        </div>

        <div className="cc-card">
          {etapa === 1 ? (
            <>
              <div className="cc-card-head">
                <h2>Crie seu acesso</h2>
                <p>Cadastre o proprietário responsável pela fazenda e pela equipe.</p>
              </div>

              <div className="cc-form">
                <div className="cc-owner-notice">
                  <span className="material-symbols-outlined">admin_panel_settings</span>
                  <span><strong>Cadastro exclusivo do proprietário</strong><small>Logins de funcionários são criados depois, dentro do painel Equipe.</small></span>
                </div>
                <div className="cc-field">
                  <label>Nome completo</label>
                  <input type="text" name="name" value={userData.name} onChange={handleUserChange} placeholder="Nome completo"/>
                </div>

                <div className="cc-row">
                  <div className="cc-field">
                    <label>Idade</label>
                    <input type="number" name="age" value={userData.age} onChange={handleUserChange} placeholder="00"/>
                  </div>
                  <div className="cc-field">
                    <label>Tipo</label>
                    <CustomSelect
                      name="type"
                      value={userData.type}
                      onChange={handleUserChange}
                      options={PERSON_TYPE_OPTIONS}
                      placeholder="Selecione o tipo de pessoa"
                      className="cc-custom-select"
                    />
                  </div>
                </div>

                {userData.type && (
                  <div className="cc-field">
                    <label>{userData.type === "CPF" ? "CPF fictício" : "CNPJ fictício"}</label>
                    <input
                      type="text" name="document" value={userData.document}
                      onChange={(e) => handleUserChange({ target: { name: "document", value: formatDocument(e.target.value, userData.type) } })}
                      placeholder={userData.type === "CPF" ? "000.000.000-00" : "00.000.000/0000-00"}
                      inputMode="numeric"
                      maxLength={userData.type === "CPF" ? 14 : 18}
                    />
                    <small className="cc-field-help">Digite somente números; a pontuação é automática. Não use um documento real. Exemplo: {userData.type === "CPF" ? "123.456.789-09" : "12.345.678/0001-95"}</small>
                    <label className="cc-demo-check"><input type="checkbox" checked={demoDocumentAcknowledgements.personal} onChange={(event) => setDemoDocumentAcknowledgements((current) => ({ ...current, personal: event.target.checked }))} /><span>Confirmo que este documento é fictício e será usado apenas na demonstração.</span></label>
                  </div>
                )}

                <div className="cc-field">
                  <label>Telefone fictício</label>
                  <input type="tel" name="phone" value={userData.phone} onChange={handleUserChange} placeholder="(00) 00000-0000" inputMode="numeric" maxLength={15}/>
                  <small className="cc-field-help">Digite somente números; a pontuação é automática. Não use um telefone real. Exemplo: (11) 98765-4321.</small>
                  <label className="cc-demo-check"><input type="checkbox" checked={demoDocumentAcknowledgements.phone} onChange={(event) => setDemoDocumentAcknowledgements((current) => ({ ...current, phone: event.target.checked }))} /><span>Confirmo que este telefone é fictício e será usado apenas na demonstração.</span></label>
                </div>

                <div className="cc-field">
                  <label>Email</label>
                  <input type="email" name="email" value={userData.email} onChange={handleUserChange} placeholder="voce@empresa.com" autoComplete="email"/>
                </div>

                <div className="cc-row">
                  <div className="cc-field">
                    <label>Senha</label>
                    <div className="cc-password-field">
                      <input type={showPassword ? "text" : "password"} name="password" value={userData.password} onChange={handleUserChange} placeholder="Crie uma senha segura" autoComplete="new-password"/>
                      <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}><span className="material-symbols-outlined">{showPassword ? "visibility_off" : "visibility"}</span></button>
                    </div>
                  </div>
                  <div className="cc-field">
                    <label>Confirmar senha</label>
                    <div className="cc-password-field">
                      <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={userData.confirmPassword} onChange={handleUserChange} placeholder="Digite a senha novamente" autoComplete="new-password"/>
                      <button type="button" onClick={() => setShowConfirmPassword((current) => !current)} aria-label={showConfirmPassword ? "Ocultar confirmação da senha" : "Mostrar confirmação da senha"}><span className="material-symbols-outlined">{showConfirmPassword ? "visibility_off" : "visibility"}</span></button>
                    </div>
                  </div>
                </div>

                <div className="cc-plan-picker">
                  <div className="cc-plan-title">
                    <span>Escolha seu plano</span>
                    <small>Voce pode alterar depois no perfil.</small>
                  </div>
                  <p className="cc-plan-notice"><span className="material-symbols-outlined" aria-hidden="true">school</span>{PLAN_NOTICE}</p>

                  <div className="cc-plan-grid">
                    {PLAN_OPTIONS.map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        className={userData.plan === plan.id ? "cc-plan-option active" : "cc-plan-option"}
                        onClick={() => handleUserChange({ target: { name: "plan", value: plan.id } })}
                      >
                        <span className="cc-plan-badge">{plan.badge}</span>
                        <strong>{plan.name}</strong>
                        <em>{plan.price}</em>
                        <ul>
                          {plan.features.map((feature) => (
                            <li key={feature}>{feature}</li>
                          ))}
                        </ul>
                      </button>
                    ))}
                  </div>
                </div>

                {alertMessage.text && etapa === 1 && (
                  <div className={`cc-alert ${alertMessage.type}`}>{alertMessage.text}</div>
                )}

                <button className="cc-btn primary" onClick={handleCreateUser} disabled={loading}>
                  {loading ? <><span className="cc-spinner"/> Criando conta...</> : "Próximo →"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="cc-card-head">
                <h2>Cadastre sua fazenda</h2>
                <p>Dados operacionais e localização da propriedade.</p>
              </div>

              <div className="cc-form">
                <div className="cc-field">
                  <label>Nome da fazenda</label>
                  <input type="text" name="name" value={farmData.name} onChange={handleFarmChange} placeholder="Ex: Fazenda Esperança"/>
                </div>

                <div className="cc-row">
                  <div className="cc-field">
                    <label>Documento da fazenda</label>
                    <div className="cc-fixed-field"><span className="material-symbols-outlined" aria-hidden="true">verified</span><span>CNPJ rural</span><small>Cadastro de Produtor Rural</small></div>
                  </div>
                  <div className="cc-field">
                    <label>Data de aquisição</label>
                    <input type="date" name="data_aquisicao" value={farmData.data_aquisicao} onChange={handleFarmChange}/>
                  </div>
                </div>

                <div className="cc-field">
                  <label>CNPJ rural</label>
                  <input type="text" name="documento_proprietario" value={farmData.documento_proprietario} onChange={handleFarmChange} inputMode="numeric" maxLength={18} placeholder="00.000.000/0000-00"/>
                  <small className="cc-field-help">Digite somente números; a pontuação é automática. Use um CNPJ rural fictício. Exemplo: 12.345.678/0001-95.</small>
                  <label className="cc-demo-check"><input type="checkbox" checked={demoDocumentAcknowledgements.farm} onChange={(event) => setDemoDocumentAcknowledgements((current) => ({ ...current, farm: event.target.checked }))} /><span>Confirmo que este CNPJ é fictício e será usado apenas na demonstração.</span></label>
                </div>

                <div className="cc-row">
                  <div className="cc-field">
                    <label>CEP</label>
                    <input type="text" name="cep" value={farmData.cep}
                      onChange={(e) => { handleFarmChange(e); buscarCEP(e.target.value) }} placeholder="00000-000"/>
                  </div>
                  <div className="cc-field">
                    <label>UF</label>
                    <CustomSelect
                      name="uf"
                      value={farmData.uf}
                      onChange={handleFarmChange}
                      options={BRAZIL_STATE_OPTIONS}
                      placeholder="Selecione a UF"
                      className="cc-custom-select"
                    />
                  </div>
                </div>

                <div className="cc-row">
                  <div className="cc-field">
                    <label>Bairro</label>
                    <input type="text" name="bairro" value={farmData.bairro} onChange={handleFarmChange} placeholder="Bairro/Distrito"/>
                  </div>
                  <div className="cc-field">
                    <label>Município</label>
                    <input type="text" name="municipio" value={farmData.municipio} onChange={handleFarmChange} placeholder="Cidade"/>
                  </div>
                </div>

                <div className="cc-field">
                  <label>Área total</label>
                  <HectareInput
                    name="area_total"
                    value={farmData.area_total}
                    onChange={handleFarmChange}
                    placeholder="Ex.: 125,5"
                  />
                </div>

                {alertMessage.text && etapa === 2 && (
                  <div className={`cc-alert ${alertMessage.type}`}>{alertMessage.text}</div>
                )}

                <div className="cc-actions">
                  <button className="cc-btn ghost" onClick={() => setEtapa(1)}>← Voltar</button>
                  <button className="cc-btn primary" onClick={handleSaveFarm} disabled={loading}>
                    {loading ? <><span className="cc-spinner"/> Cadastrando...</> : "Finalizar cadastro →"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
