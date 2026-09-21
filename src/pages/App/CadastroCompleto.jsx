import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db } from "../../services/firebase"
import { createUserWithEmailAndPassword, deleteUser } from "firebase/auth"
import { doc, setDoc, addDoc, collection } from "firebase/firestore"
import { ACCOUNT_ROLES } from "../../services/accessControl"
import { createProfileWithUniqueIdentifiers, maskAccountDocument } from "../../services/accountIdentity"
import { activateAppLanguage, getAppLanguage, persistAppLanguage } from "../../constants/appLanguages"
import CustomSelect from "../../components/App/Global/CustomSelect"
import HectareInput from "../../components/App/Global/HectareInput"
import LanguagePicker from "../../components/App/Global/LanguagePicker"
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

const REGISTRATION_MESSAGES = {
  "pt-BR": {
    required: "Preencha todos os dados obrigatórios.",
    invalidName: "Informe um nome completo válido.",
    invalidAge: "Informe uma idade válida entre 18 e 120 anos.",
    invalidCpf: "Informe um CPF fictício com 11 dígitos.",
    invalidCnpj: "Informe um CNPJ fictício com 14 dígitos.",
    invalidEmail: "Informe um email válido.",
    invalidPhone: "Informe um telefone fictício válido com DDD.",
    passwordRules: "A senha precisa ter pelo menos 8 caracteres, uma letra maiúscula, uma letra minúscula, um número e um caractere especial, sem espaços.",
    passwordMismatch: "As senhas não coincidem. Confira e tente novamente.",
    confirmDocument: "Use um CPF ou CNPJ fictício e confirme a opção de demonstração.",
    confirmPhone: "Use um telefone fictício e confirme a opção de demonstração.",
    farmRequired: "Preencha todos os dados da fazenda.",
    invalidArea: "Informe uma área total maior que zero.",
    invalidRuralCnpj: "Informe um CNPJ rural fictício com 14 dígitos.",
    confirmFarmDocument: "Use um CNPJ rural fictício e confirme a opção de demonstração.",
    invalidFarmName: "Informe um nome de fazenda válido.",
    invalidCep: "Informe um CEP válido com 8 dígitos.",
    cepNotFound: "CEP não encontrado. Confira o número informado.",
    invalidState: "Informe uma UF válida.",
    invalidDistrict: "Informe um bairro válido.",
    invalidCity: "Informe um município válido.",
    stateForCep: (value) => `A UF correspondente a esse CEP é ${value}.`,
    districtForCep: (value) => `O bairro correspondente a esse CEP é ${value}.`,
    cityForCep: (value) => `O município correspondente a esse CEP é ${value}.`,
    accountCreated: "Conta criada com sucesso. Agora cadastre sua fazenda.",
    signupError: "Erro no cadastro. Tente novamente.",
    farmError: "Erro ao cadastrar fazenda.",
    duplicateDocument: "Este CPF ou CNPJ já está cadastrado em outra conta.",
    duplicatePhone: "Este número de telefone já está cadastrado em outra conta.",
    duplicateEmail: "Este email já está cadastrado em outra conta.",
    validationUnavailable: "Não foi possível validar os dados. Atualize a página e tente novamente.",
  },
  "en-US": {
    required: "Complete all required fields.",
    invalidName: "Enter a valid full name.",
    invalidAge: "Enter a valid age between 18 and 120.",
    invalidCpf: "Enter a fictitious CPF containing 11 digits.",
    invalidCnpj: "Enter a fictitious CNPJ containing 14 digits.",
    invalidEmail: "Enter a valid email address.",
    invalidPhone: "Enter a valid fictitious phone number with area code.",
    passwordRules: "The password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character, with no spaces.",
    passwordMismatch: "The passwords do not match. Check them and try again.",
    confirmDocument: "Use a fictitious CPF or CNPJ and confirm the demonstration option.",
    confirmPhone: "Use a fictitious phone number and confirm the demonstration option.",
    farmRequired: "Complete all farm information.",
    invalidArea: "Enter a total area greater than zero.",
    invalidRuralCnpj: "Enter a fictitious rural CNPJ containing 14 digits.",
    confirmFarmDocument: "Use a fictitious rural CNPJ and confirm the demonstration option.",
    invalidFarmName: "Enter a valid farm name.",
    invalidCep: "Enter a valid 8-digit Brazilian postal code (CEP).",
    cepNotFound: "Postal code not found. Check the number entered.",
    invalidState: "Enter a valid Brazilian state code.",
    invalidDistrict: "Enter a valid district.",
    invalidCity: "Enter a valid city.",
    stateForCep: (value) => `The state code associated with this postal code is ${value}.`,
    districtForCep: (value) => `The district associated with this postal code is ${value}.`,
    cityForCep: (value) => `The city associated with this postal code is ${value}.`,
    accountCreated: "Account created successfully. Now register your farm.",
    signupError: "Registration failed. Please try again.",
    farmError: "The farm could not be registered.",
    duplicateDocument: "This CPF or CNPJ is already registered to another account.",
    duplicatePhone: "This phone number is already registered to another account.",
    duplicateEmail: "This email is already registered to another account.",
    validationUnavailable: "The information could not be validated. Refresh the page and try again.",
  },
  "es-ES": {
    required: "Completa todos los campos obligatorios.",
    invalidName: "Introduce un nombre completo válido.",
    invalidAge: "Introduce una edad válida entre 18 y 120 años.",
    invalidCpf: "Introduce un CPF ficticio de 11 dígitos.",
    invalidCnpj: "Introduce un CNPJ ficticio de 14 dígitos.",
    invalidEmail: "Introduce una dirección de correo electrónico válida.",
    invalidPhone: "Introduce un teléfono ficticio válido con código de área.",
    passwordRules: "La contraseña debe tener al menos 8 caracteres, una letra mayúscula, una letra minúscula, un número y un carácter especial, sin espacios.",
    passwordMismatch: "Las contraseñas no coinciden. Revísalas e inténtalo de nuevo.",
    confirmDocument: "Usa un CPF o CNPJ ficticio y confirma la opción de demostración.",
    confirmPhone: "Usa un teléfono ficticio y confirma la opción de demostración.",
    farmRequired: "Completa todos los datos de la finca.",
    invalidArea: "Introduce un área total mayor que cero.",
    invalidRuralCnpj: "Introduce un CNPJ rural ficticio de 14 dígitos.",
    confirmFarmDocument: "Usa un CNPJ rural ficticio y confirma la opción de demostración.",
    invalidFarmName: "Introduce un nombre de finca válido.",
    invalidCep: "Introduce un código postal brasileño (CEP) válido de 8 dígitos.",
    cepNotFound: "No se encontró el código postal. Revisa el número introducido.",
    invalidState: "Introduce un código de estado brasileño válido.",
    invalidDistrict: "Introduce un barrio válido.",
    invalidCity: "Introduce un municipio válido.",
    stateForCep: (value) => `El estado correspondiente a este código postal es ${value}.`,
    districtForCep: (value) => `El barrio correspondiente a este código postal es ${value}.`,
    cityForCep: (value) => `El municipio correspondiente a este código postal es ${value}.`,
    accountCreated: "La cuenta se creó correctamente. Ahora registra tu finca.",
    signupError: "Error durante el registro. Inténtalo de nuevo.",
    farmError: "No se pudo registrar la finca.",
    duplicateDocument: "Este CPF o CNPJ ya está registrado en otra cuenta.",
    duplicatePhone: "Este número de teléfono ya está registrado en otra cuenta.",
    duplicateEmail: "Este correo electrónico ya está registrado en otra cuenta.",
    validationUnavailable: "No se pudieron validar los datos. Actualiza la página e inténtalo de nuevo.",
  },
}

const getRegistrationMessages = (language) => REGISTRATION_MESSAGES[language] || REGISTRATION_MESSAGES["pt-BR"]

const getAccountErrorMessage = (error, messages) => {
  if (error?.code === "account/document-already-in-use") return messages.duplicateDocument
  if (error?.code === "account/phone-already-in-use") return messages.duplicatePhone
  if (error?.code === "auth/email-already-in-use") return messages.duplicateEmail
  if (error?.code === "permission-denied" || error?.code === "firestore/permission-denied") return messages.validationUnavailable
  return ""
}

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
const getPasswordError = (password, messages) => {
  const isValid = password.length >= 8
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /\d/.test(password)
    && /[!@#$%^&*()_+\-={}\[\]:;<>?,./]/.test(password)
    && !/\s/.test(password)
  return isValid
    ? ""
    : messages.passwordRules
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
  const initialLanguage = getAppLanguage()

  const [userData, setUserData] = useState({
    name: "", age: "", type: "", document: "", phone: "", email: "", password: "", confirmPassword: "", plan: "agro-vision", language: initialLanguage
  })
  const messages = getRegistrationMessages(userData.language)
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
      setAlertMessage({ type: "error", text: messages.required })
      return false
    }
    if (!hasMinLetters(userData.name, 3)) {
      setAlertMessage({ type: "error", text: messages.invalidName })
      return false
    }
    const age = Number(userData.age)
    if (!Number.isInteger(age) || age < 18 || age > 120) {
      setAlertMessage({ type: "error", text: messages.invalidAge })
      return false
    }
    const documentDigits = userData.document.replace(/\D/g, "")
    if (userData.type === "CPF" && !isValidCPF(documentDigits)) {
      setAlertMessage({ type: "error", text: messages.invalidCpf })
      return false
    }
    if (userData.type === "PJ" && !isValidCNPJ(documentDigits)) {
      setAlertMessage({ type: "error", text: messages.invalidCnpj })
      return false
    }
    if (!isValidEmail(userData.email)) {
      setAlertMessage({ type: "error", text: messages.invalidEmail })
      return false
    }
    if (!isValidPhone(userData.phone.replace(/\D/g, ""))) {
      setAlertMessage({ type: "error", text: messages.invalidPhone })
      return false
    }
    const passwordError = getPasswordError(userData.password, messages)
    if (passwordError) {
      setAlertMessage({ type: "error", text: passwordError })
      return false
    }
    if (userData.password !== userData.confirmPassword) {
      setAlertMessage({ type: "error", text: messages.passwordMismatch })
      return false
    }
    if (!demoDocumentAcknowledgements.personal) {
      setAlertMessage({ type: "error", text: messages.confirmDocument })
      return false
    }
    if (!demoDocumentAcknowledgements.phone) {
      setAlertMessage({ type: "error", text: messages.confirmPhone })
      return false
    }
    return true
  }
  const validateFarmData = async () => {
    const f = farmData
    if (!f.name || !f.tipo_proprietario || !f.documento_proprietario || !f.data_aquisicao || !f.cep || !f.bairro || !f.municipio || !f.uf || !f.area_total || !f.plantacao) {
      setAlertMessage({ type: "error", text: messages.farmRequired })
      return false
    }
    if (!isValidHectares(f.area_total)) { setAlertMessage({ type: "error", text: messages.invalidArea }); return false }
    const ownerDocument = f.documento_proprietario.replace(/\D/g, "")
    if (!isValidCNPJ(ownerDocument)) { setAlertMessage({ type: "error", text: messages.invalidRuralCnpj }); return false }
    if (!demoDocumentAcknowledgements.farm) { setAlertMessage({ type: "error", text: messages.confirmFarmDocument }); return false }
    if (!hasMinLetters(f.name, 3)) { setAlertMessage({ type: "error", text: messages.invalidFarmName }); return false }
    const cepDigits = f.cep.replace(/\D/g, "")
    if (cepDigits.length !== 8) { setAlertMessage({ type: "error", text: messages.invalidCep }); return false }
    let validCEP = cepData
    if (!validCEP || validCEP.cep?.replace(/\D/g, "") !== cepDigits) {
      try { const response = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`); const data = await response.json(); validCEP = response.ok && !data.erro ? data : null; if (validCEP) setCepData(validCEP) } catch { validCEP = null }
    }
    if (!validCEP) { setAlertMessage({ type: "error", text: messages.cepNotFound }); return false }
    if (!BRAZIL_STATE_SET.has(f.uf) || (validCEP.uf && f.uf !== validCEP.uf)) { setAlertMessage({ type: "error", text: validCEP.uf ? messages.stateForCep(validCEP.uf) : messages.invalidState }); return false }
    if (!hasMinLetters(f.bairro, 2) || (validCEP.bairro && normalizeText(f.bairro) !== normalizeText(validCEP.bairro))) { setAlertMessage({ type: "error", text: validCEP.bairro ? messages.districtForCep(validCEP.bairro) : messages.invalidDistrict }); return false }
    if (!hasMinLetters(f.municipio, 2) || (validCEP.localidade && normalizeText(f.municipio) !== normalizeText(validCEP.localidade))) { setAlertMessage({ type: "error", text: validCEP.localidade ? messages.cityForCep(validCEP.localidade) : messages.invalidCity }); return false }
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
        language: userData.language,
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
        text: messages.accountCreated,
      })
    } catch (error) {
      if (createdUser && auth.currentUser?.uid === createdUser.uid) {
        try { await deleteUser(createdUser) } catch {   }
      }
      let msg = getAccountErrorMessage(error, messages) || messages.signupError
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
      persistAppLanguage(userData.language)
      window.location.assign("/home")
    } catch (error) {
      console.error(error)
      setAlertMessage({ type: "error", text: getAccountErrorMessage(error, messages) || messages.farmError })
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

                <LanguagePicker
                  value={userData.language}
                  onChange={(language) => {
                    handleUserChange({ target: { name: "language", value: language } })
                    activateAppLanguage(language)
                  }}
                />

                <div className="cc-plan-picker">
                  <div className="cc-plan-title">
                    <span>Escolha seu plano</span>
                    <small>Voce pode alterar depois no perfil.</small>
                  </div>
                  <p className="cc-plan-notice"><span className="material-symbols-outlined notranslate" translate="no" data-icon="school" aria-hidden="true">school</span>{PLAN_NOTICE}</p>

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
                  <div className={`cc-alert ${alertMessage.type} notranslate`} translate="no">{alertMessage.text}</div>
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
                  <div className={`cc-alert ${alertMessage.type} notranslate`} translate="no">{alertMessage.text}</div>
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
