
import { useState, useEffect, useRef } from "react"
import { auth, db } from "../../services/firebase"
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore"
import { useLocation, useNavigate } from "react-router-dom"
import { getUserAccessProfile, isOperationalRole } from "../../services/accessControl"
import { BRAZIL_STATE_CODES, BRAZIL_STATE_SET } from "../../constants/brazilStates"
import { isValidHectares, parseHectaresInput, sanitizeHectaresInput } from "../../utils/hectares"
import { maskAccountDocument } from "../../services/accountIdentity"

import MenuBar from "../../components/App/Global/MenuBar"
import AppHeader from "../../components/App/Global/AppHeader"
import AppFooter from "../../components/App/Global/AppFooter"
import SplashScreen from "../../components/App/Global/SplashScreen"
import HectareInput from "../../components/App/Global/HectareInput"

import "../../styles/App/Profile.css"


const onlyDigits = (v) => String(v || "").replace(/\D/g, "")
const protectedFarmDocument = (value) => {
  const text = String(value || "").trim()
  if (!text) return ""
  return text.includes("*") ? text : maskAccountDocument(text)
}

const formatPhoneInput = (value) => {
  const d = onlyDigits(value).slice(0, 11)
  if (!d) return ""
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

const formatCPFInput = (value) => {
  const d = onlyDigits(value).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

const formatCNPJInput = (value) => {
  const d = onlyDigits(value).slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

const formatDocumentInput = (value, type) => {
  if (type === "PJ") return formatCNPJInput(value)
  return formatCPFInput(value)
}

const formatCEPInput = (value) => {
  const d = onlyDigits(value).slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

const formatNameInput = (value) =>
  String(value || "")
    .replace(/[^\p{L}\s.'-]/gu, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, 80)

const formatCityInput = (value) =>
  String(value || "")
    .replace(/[^\p{L}\s.'-]/gu, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, 60)

const normalizeText = (value) => String(value || "").trim().replace(/\s+/g, " ")

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(value || "").trim())

const isValidPhone = (value) => {
  const d = onlyDigits(value)
  return d.length === 10 || d.length === 11
}

const isValidCityName = (value) => {
  const city = normalizeText(value)
  return city.length >= 3 && /\p{L}/u.test(city) && !/^[A-Z]{2}$/i.test(city)
}

const PROFILE_ICONS = [
  "agriculture",
  "eco",
  "grass",
  "forest",
  "park",
  "yard",
  "local_florist",
  "spa",
]

const TABS = [
  { id: "pessoal", label: "Pessoal", icon: "person" },
  { id: "fazenda", label: "Fazenda", icon: "agriculture" },
  { id: "seguranca", label: "Conta", icon: "shield" },
]

const PLAN_OPTIONS = [
  {
    id: "agro-vision",
    name: "Agro Vision",
    badge: "Até 50 ha",
    price: "R$ 799/anual",
    icon: "visibility",
    features: [
      "Monitoramento de até 50 ha",
      "Relatórios mensais com IA",
      "Suporte por e-mail",
      "Acesso ao monitoramento e detecção da plantação",
    ],
  },
  {
    id: "agro-imperial",
    name: "Agro Imperial",
    badge: "Profissional",
    price: "R$ 1200/anual",
    icon: "workspace_premium",
    features: [
      "Monitoramento de até 200 ha",
      "Relatórios semanais com IA",
      "Suporte prioritário 24/7",
      "Acesso completo ao app",
      "Consultoria especializada",
    ],
  },
  {
    id: "agro-enterprise",
    name: "Agro Enterprise",
    badge: "Empresarial",
    price: "Sob consulta",
    icon: "domain",
    features: [
      "Monitoramento ilimitado",
      "Relatórios em tempo real",
      "API de integração",
      "Gestor de conta exclusivo",
      "Treinamento in loco",
    ],
  },
]

const PLAN_NOTICE = "Valores simbólicos para demonstração acadêmica. Nenhuma cobrança real é realizada."

const getPlanByValue = (value) => {
  const raw = String(value || "").trim().toLowerCase()
  return (
    PLAN_OPTIONS.find((plan) =>
      [plan.id, plan.name.toLowerCase()].includes(raw)
    ) || PLAN_OPTIONS[0]
  )
}


export default function Profile() {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [farmData, setFarmData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editingFarm, setEditingFarm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingFarm, setSavingFarm] = useState(false)
  const [savingPlan, setSavingPlan] = useState("")
  const [activeTab, setActiveTab] = useState("pessoal")
  const [alert, setAlert] = useState({ type: "", text: "" })

  const [formData, setFormData] = useState({
    name: "",
    age: "",
    type: "",
    document: "",
    email: "",
    profileIcon: "agriculture",
    phone: "",
    city: "",
    state: "",
  })

  const [farmForm, setFarmForm] = useState({
    name: "",
    area_total: "",
    plantacao: "Soja",
    municipio: "",
    uf: "",
    bairro: "",
    cep: "",
    data_aquisicao: "",
    telefone: "",
    tipo_proprietario: "PJ",
    documento_proprietario: "",
  })

  const navigate = useNavigate()
  const location = useLocation()
  const alertTimer = useRef(null)


  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (current) => {
      if (current) {
        setUser(current)
        const profile = await loadUserData(current.uid)
        await loadFarmData(profile?.ownerId || profile?.teamId || current.uid)
      } else {
        navigate("/login")
      }
      setLoading(false)
    })
    return () => unsub()
  }, [navigate])

  useEffect(() => {
    if (location.state?.tab) setActiveTab(location.state.tab)
  }, [location.state?.tab])

  const loadUserData = async (uid) => {
    try {
      const data = await getUserAccessProfile(uid)
      if (data) {
        setUserData(data)
        setFormData({
          name: data.name || "",
          age: data.age || "",
          type: data.type || "",
          document: data.documentMasked || formatDocumentInput(data.document || "", data.type || "CPF"),
          email: data.email || "",
          profileIcon: data.profileIcon || "agriculture",
          phone: data.phoneMasked || formatPhoneInput(data.phone || ""),
          city: data.city || "",
          state: data.state || "",
        })
        return data
      }
    } catch (e) {
      console.error(e)
      showAlert("error", "Erro ao carregar perfil")
    }
  }

  const loadFarmData = async (uid) => {
    try {
      const ref = collection(db, "farms")
      const q = query(ref, where("ownerId", "==", uid))
      const snap = await getDocs(q)
      if (!snap.empty) {
        const d = snap.docs[0]
        const data = d.data()
        const farm = {
          id: d.id,
          name: data.name || "",
          area_total: data.area_total || "0",
          bairro: data.bairro || "",
          cep: data.cep || "",
          createdAt: data.createdAt || null,
          data_aquisicao: data.data_aquisicao || "",
          municipio: data.municipio || "",
          plantacao: "Soja",
          telefone: data.telefone_mascarado || data.telefone || "",
          tipo_proprietario: "PJ",
          documento_proprietario: protectedFarmDocument(data.documento_proprietario_mascarado || data.documento_proprietario),
          uf: data.uf || "",
        }
        setFarmData(farm)
        setFarmForm({
          ...farm,
          cep: formatCEPInput(farm.cep),
          telefone: farm.telefone,
        })
      } else {
        setFarmData(null)
      }
    } catch (e) {
      console.error(e)
      showAlert("error", "Erro ao carregar dados da fazenda")
    }
  }

  const showAlert = (type, text) => {
    setAlert({ type, text })
    clearTimeout(alertTimer.current)
    alertTimer.current = setTimeout(
      () => setAlert({ type: "", text: "" }),
      3000
    )
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    let next = value
    if (name === "type") {
      setFormData((current) => ({
        ...current,
        type: value,
        document: formatDocumentInput(current.document, value),
      }))
      return
    }
    if (name === "name") next = formatNameInput(value)
    if (name === "phone") next = formatPhoneInput(value)
    if (name === "document") next = formatDocumentInput(value, formData.type)
    if (name === "email") next = value.trim().toLowerCase().slice(0, 120)
    if (name === "city") next = formatCityInput(value)
    if (name === "state")
      next = value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2)
    setFormData({ ...formData, [name]: next })
  }

  const handleFarmChange = (e) => {
    const { name, value } = e.target
    let next = value
    if (name === "telefone") next = formatPhoneInput(value)
    if (name === "cep") next = formatCEPInput(value)
    if (name === "municipio") next = formatCityInput(value)
    if (name === "uf")
      next = value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2)
    if (name === "area_total") next = sanitizeHectaresInput(value)
    setFarmForm({ ...farmForm, [name]: next })
  }

  const resetForm = () => {
    setFormData({
      name: userData?.name || "",
      age: userData?.age || "",
      type: userData?.type || "",
      document: userData?.documentMasked || formatDocumentInput(userData?.document || "", userData?.type || "CPF"),
      email: user?.email || "",
      profileIcon: userData?.profileIcon || "agriculture",
      phone: userData?.phoneMasked || formatPhoneInput(userData?.phone || ""),
      city: userData?.city || "",
      state: userData?.state || "",
    })
  }

  const handleSave = async () => {
    if (!user) return
    if (isEmployeeAccount) {
      showAlert("error", "Os dados do funcionário são administrados pelo proprietário.")
      return
    }
    const name = normalizeText(formData.name)
    const email = normalizeText(formData.email || user?.email).toLowerCase()
    const city = normalizeText(formData.city)
    const state = normalizeText(formData.state).toUpperCase()

    if (name.split(" ").filter(Boolean).length < 2) {
      showAlert("error", "Informe o nome completo.")
      return
    }
    if (!isValidEmail(email)) {
      showAlert("error", "Informe um e-mail válido, como nome@gmail.com.")
      return
    }
    if (city && !isValidCityName(city)) {
      showAlert("error", "Informe o nome completo da cidade, sem abreviação.")
      return
    }
    if (state && !BRAZIL_STATE_SET.has(state)) {
      showAlert("error", "Selecione uma UF válida.")
      return
    }

    setSaving(true)
    try {
      await updateDoc(doc(db, userData?.profileCollection || "owners", user.uid), {
        name,
        age: parseInt(formData.age) || null,
        email,
        profileIcon: formData.profileIcon,
        city,
        state,
        updatedAt: new Date().toISOString(),
      })
      showAlert("success", "Perfil atualizado com sucesso!")
      setEditing(false)
      await loadUserData(user.uid)
    } catch (e) {
      console.error(e)
      showAlert("error", "Erro ao atualizar perfil")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveFarm = async () => {
    if (!user || !farmData?.id) return
    if (isEmployeeAccount) {
      showAlert("error", "Os dados da fazenda são administrados pelo proprietário.")
      return
    }
    const municipio = normalizeText(farmForm.municipio)
    const cepDigits = onlyDigits(farmForm.cep)

    if (municipio && !isValidCityName(municipio)) {
      showAlert("error", "Informe o município completo, sem abreviação.")
      return
    }
    if (cepDigits && cepDigits.length !== 8) {
      showAlert("error", "CEP deve ter 8 números.")
      return
    }
    if (farmForm.uf && !BRAZIL_STATE_SET.has(farmForm.uf)) {
      showAlert("error", "Selecione uma UF válida para a fazenda.")
      return
    }
    if (!isValidHectares(farmForm.area_total)) {
      showAlert("error", "Informe uma área total maior que zero.")
      return
    }

    setSavingFarm(true)
    try {
      await updateDoc(doc(db, "farms", farmData.id), {
        name: normalizeText(farmForm.name),
        area_total: parseHectaresInput(farmForm.area_total),
        plantacao: "Soja",
        municipio,
        uf: farmForm.uf,
        bairro: normalizeText(farmForm.bairro),
        cep: formatCEPInput(cepDigits),
        data_aquisicao: farmForm.data_aquisicao || "",
        updatedAt: new Date().toISOString(),
      })
      showAlert("success", "Fazenda atualizada com sucesso!")
      setEditingFarm(false)
      await loadFarmData(userData?.ownerId || userData?.teamId || user.uid)
    } catch (e) {
      console.error(e)
      showAlert("error", "Erro ao atualizar fazenda")
    } finally {
      setSavingFarm(false)
    }
  }

  const handlePlanSelect = async (planId) => {
    if (!user) return
    const plan = PLAN_OPTIONS.find((item) => item.id === planId)
    if (!plan) return

    setSavingPlan(planId)
    try {
      await updateDoc(doc(db, userData?.profileCollection || "owners", user.uid), {
        plan: plan.id,
        planName: plan.name,
        updatedAt: new Date().toISOString(),
      })
      setUserData((current) => ({
        ...current,
        plan: plan.id,
        planName: plan.name,
      }))
      showAlert("success", `Plano ${plan.name} selecionado.`)
    } catch (e) {
      console.error(e)
      showAlert("error", "Erro ao atualizar plano")
    } finally {
      setSavingPlan("")
    }
  }

  const handleLogout = async () => {
    try {
      await auth.signOut()
      navigate("/login")
    } catch (e) {
      console.error(e)
    }
  }

  const formatDocument = (d, type = userData?.type) => {
    if (!d) return "Não informado"
    if (type === "PJ") return formatCNPJInput(d)
    return formatCPFInput(d)
  }

  const memberTime = () => {
    if (!userData?.createdAt) return "Hoje"
    const created = new Date(userData.createdAt)
    const now = new Date()
    const diffMs = now - created
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "hoje"
    if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? "dia" : "dias"}`
    }
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7)
      return `${weeks} ${weeks === 1 ? "semana" : "semanas"}`
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return `${months} ${months === 1 ? "mês" : "meses"}`
    }
    const years = Math.floor(diffDays / 365)
    return `${years} ${years === 1 ? "ano" : "anos"}`
  }

  const totalHectares = () => {
    if (farmData?.area_total) {
      const a = parseFloat(farmData.area_total)
      if (!isNaN(a)) return a.toFixed(1)
    }
    return "0"
  }

  const currentPlan = getPlanByValue(
    userData?.plan || userData?.planName || userData?.plano
  )
  const isEmployeeAccount = isOperationalRole(userData?.role)
































































  if (loading) return <SplashScreen message="Carregando perfil..." />

  return (
    <>
      <AppHeader />

      <main className="pf-page">
        <div className="pf-atmosphere" aria-hidden="true">
          <div className="pf-bg-image" />
          <div className="pf-grid-overlay" />
          <div className="pf-circuit-layer">
            <span className="pf-circuit-dot dot-1" />
            <span className="pf-circuit-dot dot-2" />
            <span className="pf-data-line line-1" />
            <span className="pf-data-line line-2" />
            <span className="pf-float-icon fi-1 material-symbols-outlined">agriculture</span>
            <span className="pf-float-icon fi-2 material-symbols-outlined">verified</span>
            <span className="pf-float-icon fi-3 material-symbols-outlined">eco</span>
          </div>
          <div className="pf-grain-overlay" />
        </div>


        <section className="pf-hero">
          <div className="pf-hero-inner">
            <div className="pf-avatar">
              <span className="material-symbols-outlined">
                {formData.profileIcon || "agriculture"}
              </span>
              <div className="pf-avatar-badge" title="Verificado">
                <span className="material-symbols-outlined">verified</span>
              </div>
            </div>

            <div className="pf-hero-info">
              <div className="pf-hero-eyebrow">
                <span className="pf-dot" /> Conta ativa
              </div>
              <h1 className="pf-hero-name">
                {userData?.name || "Bem-vindo"}
              </h1>
              <p className="pf-hero-meta">
                <span className="material-symbols-outlined">mail</span>
                {user?.email}
              </p>
              <p className="pf-hero-meta">
                <span className="material-symbols-outlined">schedule</span>
                Membro há {memberTime()}
              </p>
              <div className="pf-hero-actions">
                {!isEmployeeAccount && !editing && activeTab === "pessoal" && (
                  <button
                    className="pf-btn pf-btn-primary"
                    onClick={() => setEditing(true)}
                  >
                    <span className="material-symbols-outlined">edit</span>
                    Editar perfil
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>


        <section className="pf-stats">
          <div className="pf-stat">
            <span className="material-symbols-outlined">eco</span>
            <div>
              <b>{totalHectares()}</b>
              <span>Hectares</span>
            </div>
          </div>
          <div className="pf-stat">
            <span className="material-symbols-outlined">agriculture</span>
            <div>
              <b>{farmData ? "1" : "0"}</b>
              <span>Fazenda</span>
            </div>
          </div>
          <div className="pf-stat">
            <span className="material-symbols-outlined">calendar_month</span>
            <div>
              <b>{userData?.age || "-"}</b>
              <span>Idade</span>
            </div>
          </div>
          {!isEmployeeAccount && <div className="pf-stat pf-stat-plan">
            <span className="material-symbols-outlined">workspace_premium</span>
            <div>
              <b>{currentPlan.name}</b>
              <span>Plano</span>
            </div>
          </div>}
        </section>


        <div className="pf-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={activeTab === t.id ? "pf-tab pf-tab-active" : "pf-tab"}
              onClick={() => {
                setActiveTab(t.id)
                setEditing(false)
                setEditingFarm(false)
                resetForm()
              }}
            >
              <span className="material-symbols-outlined">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>


        {alert.text && (
          <div className={`pf-alert pf-alert-${alert.type}`}>
            <span className="material-symbols-outlined">
              {alert.type === "success" ? "check_circle" : "error"}
            </span>
            {alert.text}
          </div>
        )}


        <div className="pf-content">

          {activeTab === "pessoal" && (
            <div className="pf-card" style={{ animationDelay: "0ms" }}>
              <div className="pf-card-header">
                <span className="material-symbols-outlined">person</span>
                <div className="pf-personal-heading"><h2>Informações pessoais</h2><p>Mantenha cidade e telefone atualizados para personalizar os recursos da plataforma.</p></div>
                {!isEmployeeAccount && !editing && (
                  <button
                    className="pf-btn pf-btn-primary"
                    type="button"
                    onClick={() => {
                      resetForm()
                      setEditing(true)
                    }}
                  >
                    <span className="material-symbols-outlined">edit</span>
                    Editar informações
                  </button>
                )}
                {editing && (
                  <div className="pf-card-actions">
                    <button
                      className="pf-btn pf-btn-ghost"
                      onClick={() => {
                        setEditing(false)
                        resetForm()
                      }}
                      disabled={saving}
                    >
                      Cancelar
                    </button>
                    <button
                      className="pf-btn pf-btn-primary"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <span className="pf-spinner" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined">save</span>
                          Salvar
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {!editing ? (
                <div className="pf-grid">
                  <div className="pf-field">
                    <label>Nome completo</label>
                    <p>{userData?.name || "—"}</p>
                  </div>
                  <div className="pf-field">
                    <label>Email</label>
                    <p>{user?.email}</p>
                  </div>
                  <div className="pf-field">
                    <label>Telefone</label>
                    <p>{userData?.phoneMasked || formData.phone || "—"}</p>
                  </div>
                  <div className="pf-field">
                    <label>Idade</label>
                    <p>{userData?.age ? `${userData.age} anos` : "—"}</p>
                  </div>
                  <div className="pf-field">
                    <label>Tipo de pessoa</label>
                    <p>{userData?.type === "PJ" ? "Pessoa jurídica" : userData?.type === "CPF" ? "Pessoa física" : "—"}</p>
                  </div>
                  <div className="pf-field">
                    <label>Documento</label>
                    <p>{userData?.documentMasked || formatDocument(userData?.document, userData?.type)}</p>
                  </div>
                  <div className="pf-field">
                    <label>Cidade</label>
                    <p>
                      {userData?.city
                        ? `${userData.city}${userData.state ? ` - ${userData.state}` : ""}`
                        : "—"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="pf-grid">
                  <div className="pf-field pf-field-input">
                    <label htmlFor="name">Nome completo</label>
                    <input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Seu nome"
                      autoComplete="name"
                      maxLength={80}
                    />
                  </div>
                  <div className="pf-field pf-field-input">
                    <label htmlFor="email">Email</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="seu@email.com"
                      autoComplete="email"
                      maxLength={120}
                      disabled
                    />
                  </div>
                  <div className="pf-field pf-field-input">
                    <label htmlFor="phone">Telefone</label>
                    <input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="(00) 00000-0000"
                      inputMode="tel"
                      maxLength={15}
                      disabled
                    />
                  </div>
                  <div className="pf-field pf-field-input">
                    <label htmlFor="age">Idade</label>
                    <input
                      id="age"
                      name="age"
                      type="number"
                      value={formData.age}
                      onChange={handleChange}
                      placeholder="25"
                      min={1}
                      max={120}
                    />
                  </div>
                  <div className="pf-field pf-field-input">
                    <label htmlFor="type">Tipo de pessoa</label>
                    <select
                      id="type"
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      disabled
                    >
                      <option value="">Selecione</option>
                      <option value="CPF">Pessoa física (CPF)</option>
                      <option value="PJ">Pessoa jurídica (CNPJ)</option>
                    </select>
                  </div>
                  <div className="pf-field pf-field-input">
                    <label htmlFor="document">
                      {formData.type === "PJ" ? "CNPJ" : "CPF"}
                    </label>
                    <input
                      id="document"
                      name="document"
                      value={formData.document}
                      onChange={handleChange}
                      placeholder={
                        formData.type === "PJ"
                          ? "00.000.000/0000-00"
                          : "000.000.000-00"
                      }
                      inputMode="numeric"
                      maxLength={formData.type === "PJ" ? 18 : 14}
                      disabled
                    />
                  </div>
                  <div className="pf-field pf-field-input">
                    <label htmlFor="city">Cidade</label>
                    <input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Sua cidade"
                      autoComplete="address-level2"
                      maxLength={60}
                    />
                  </div>
                  <div className="pf-field pf-field-input">
                    <label htmlFor="state">UF</label>
                    <select
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      autoComplete="address-level1"
                    >
                      <option value="">Selecione</option>
                      {BRAZIL_STATE_CODES.map((uf) => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                  <div className="pf-field pf-field-full pf-field-input">
                    <label>Ícone do perfil</label>
                    <div className="pf-icon-picker">
                      {PROFILE_ICONS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          className={
                            formData.profileIcon === icon
                              ? "pf-icon pf-icon-active"
                              : "pf-icon"
                          }
                          onClick={() =>
                            setFormData({ ...formData, profileIcon: icon })
                          }
                          title={icon}
                        >
                          <span className="material-symbols-outlined">{icon}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              </div>
          )}


          {activeTab === "fazenda" && (
            <div className="pf-card" style={{ animationDelay: "60ms" }}>
              <div className="pf-card-header">
                <span className="material-symbols-outlined">agriculture</span>
                <h2>Dados da fazenda</h2>
                {!isEmployeeAccount && farmData && !editingFarm && (
                  <button
                    className="pf-btn pf-btn-primary"
                    onClick={() => setEditingFarm(true)}
                  >
                    <span className="material-symbols-outlined">edit</span>
                    Editar fazenda
                  </button>
                )}
                {editingFarm && (
                  <div className="pf-card-actions">
                    <button
                      className="pf-btn pf-btn-ghost"
                      onClick={() => {
                        setEditingFarm(false)
                        if (farmData)
                          setFarmForm({
                            ...farmData,
                            cep: formatCEPInput(farmData.cep),
                            telefone: farmData.telefone,
                          })
                      }}
                      disabled={savingFarm}
                    >
                      Cancelar
                    </button>
                    <button
                      className="pf-btn pf-btn-primary"
                      onClick={handleSaveFarm}
                      disabled={savingFarm}
                    >
                      {savingFarm ? (
                        <>
                          <span className="pf-spinner" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined">save</span>
                          Salvar
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {!farmData ? (
                <div className="pf-empty">
                  <span className="material-symbols-outlined">agriculture</span>
                  <p>Nenhuma fazenda cadastrada</p>
                </div>
              ) : !editingFarm ? (
                <div className="pf-grid">
                  <div className="pf-field">
                    <label>Nome da propriedade</label>
                    <p>{farmData.name || "—"}</p>
                  </div>
                  <div className="pf-field">
                    <label>Área total</label>
                    <p>
                      {farmData.area_total
                        ? `${parseFloat(farmData.area_total).toFixed(1)} ha`
                        : "—"}
                    </p>
                  </div>
                  <div className="pf-field">
                    <label>Cultivo principal</label>
                    <p>Soja</p>
                  </div>
                  <div className="pf-field">
                    <label>Município</label>
                    <p>
                      {farmData.municipio
                        ? `${farmData.municipio} - ${farmData.uf}`
                        : "—"}
                    </p>
                  </div>
                  <div className="pf-field">
                    <label>Bairro</label>
                    <p>{farmData.bairro || "—"}</p>
                  </div>
                  <div className="pf-field">
                    <label>CEP</label>
                    <p>{farmData.cep || "—"}</p>
                  </div>
                  <div className="pf-field">
                    <label>Data de aquisição</label>
                    <p>{farmData.data_aquisicao || "—"}</p>
                  </div>
                  <div className="pf-field">
                    <label>Telefone</label>
                    <p>{farmData.telefone || "—"}</p>
                  </div>
                  <div className="pf-field">
                    <label>Documento da fazenda</label>
                    <p>CNPJ rural · Cadastro de Produtor Rural</p>
                  </div>
                  <div className="pf-field">
                    <label>CNPJ rural</label>
                    <p>{farmData.documento_proprietario || "—"}</p>
                  </div>
                </div>
              ) : (
                <div className="pf-grid">
                  <div className="pf-field pf-field-input">
                    <label htmlFor="farm-name">Nome da propriedade</label>
                    <input
                      id="farm-name"
                      name="name"
                      value={farmForm.name}
                      onChange={handleFarmChange}
                      placeholder="Nome da fazenda"
                      maxLength={80}
                    />
                  </div>
                  <div className="pf-field pf-field-input">
                    <label htmlFor="farm-area">Área total</label>
                    <HectareInput
                      id="farm-area"
                      name="area_total"
                      value={farmForm.area_total}
                      onChange={handleFarmChange}
                      placeholder="Ex.: 125,5"
                    />
                  </div>
                  <div className="pf-field pf-field-input">
                    <label htmlFor="farm-municipio">Município</label>
                    <input
                      id="farm-municipio"
                      name="municipio"
                      value={farmForm.municipio}
                      onChange={handleFarmChange}
                      placeholder="Município"
                      autoComplete="address-level2"
                      maxLength={60}
                    />
                  </div>
                  <div className="pf-field pf-field-input">
                    <label htmlFor="farm-uf">UF</label>
                    <select
                      id="farm-uf"
                      name="uf"
                      value={farmForm.uf}
                      onChange={handleFarmChange}
                    >
                      <option value="">Selecione</option>
                      {BRAZIL_STATE_CODES.map((uf) => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                  <div className="pf-field pf-field-input">
                    <label htmlFor="farm-bairro">Bairro</label>
                    <input
                      id="farm-bairro"
                      name="bairro"
                      value={farmForm.bairro}
                      onChange={handleFarmChange}
                      placeholder="Bairro"
                    />
                  </div>
                  <div className="pf-field pf-field-input">
                    <label htmlFor="farm-cep">CEP</label>
                    <input
                      id="farm-cep"
                      name="cep"
                      value={farmForm.cep}
                      onChange={handleFarmChange}
                      placeholder="00000-000"
                      inputMode="numeric"
                      maxLength={9}
                    />
                  </div>
                  <div className="pf-field pf-field-input">
                    <label htmlFor="farm-data">Data de aquisição</label>
                    <input
                      id="farm-data"
                      name="data_aquisicao"
                      type="date"
                      value={farmForm.data_aquisicao}
                      onChange={handleFarmChange}
                    />
                  </div>
                  <div className="pf-field pf-field-input">
                    <label htmlFor="farm-telefone">Telefone</label>
                    <input
                      id="farm-telefone"
                      name="telefone"
                      value={farmForm.telefone}
                      onChange={handleFarmChange}
                      placeholder="(00) 00000-0000"
                      inputMode="tel"
                      maxLength={15}
                      disabled
                    />
                  </div>
                  <div className="pf-field pf-field-input">
                    <label htmlFor="farm-documento">CNPJ rural</label>
                    <input id="farm-documento" value={farmForm.documento_proprietario || "Documento protegido"} disabled />
                    <small className="pf-field-help">Cadastro de Produtor Rural · documento protegido</small>
                  </div>
                </div>
              )}
              </div>
          )}


          {activeTab === "seguranca" && (
            <>
              {!isEmployeeAccount && <div className="pf-card pf-plan-card" style={{ animationDelay: "90ms" }}>
                <div className="pf-card-header pf-plan-header">
                  <span className="material-symbols-outlined">workspace_premium</span>
                  <div>
                    <h2>Planos Zenith</h2>
                    <p>Plano atual: <strong>{currentPlan.name}</strong></p>
                  </div>
                </div>
                <p className="pf-plan-notice"><span className="material-symbols-outlined" aria-hidden="true">school</span>{PLAN_NOTICE}</p>

                <div className="pf-plan-grid">
                  {PLAN_OPTIONS.map((plan) => {
                    const active = currentPlan.id === plan.id
                    const savingThisPlan = savingPlan === plan.id

                    return (
                      <article
                        key={plan.id}
                        className={active ? "pf-plan-option pf-plan-active" : "pf-plan-option"}
                      >
                        <div className="pf-plan-top">
                          <span className="pf-plan-badge">{plan.badge}</span>
                          <span className="material-symbols-outlined">{plan.icon}</span>
                        </div>
                        <h3>{plan.name}</h3>
                        <strong className="pf-plan-price">{plan.price}</strong>
                        <ul>
                          {plan.features.map((feature) => (
                            <li key={feature}>
                              <span className="material-symbols-outlined">check_circle</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <button
                          className={active ? "pf-btn pf-btn-ghost" : "pf-btn pf-btn-primary"}
                          type="button"
                          onClick={() => handlePlanSelect(plan.id)}
                          disabled={active || Boolean(savingPlan)}
                        >
                          {savingThisPlan ? (
                            <>
                              <span className="pf-spinner" />
                              Assinando...
                            </>
                          ) : active ? (
                            "Plano atual"
                          ) : (
                            "Assinar"
                          )}
                        </button>
                      </article>
                    )
                  })}
                </div>
              </div>}

              <div className="pf-card" style={{ animationDelay: "120ms" }}>
              <div className="pf-card-header">
                <span className="material-symbols-outlined">shield</span>
                <h2>Conta e segurança</h2>
              </div>
              <div className="pf-grid">
                <div className="pf-field">
                  <label>ID da conta</label>
                  <p className="pf-mono">{user?.uid?.slice(0, 16)}...</p>
                </div>
                <div className="pf-field"><label>Email da conta</label><p>{user?.email || "—"}</p></div>
                <div className="pf-field">
                  <label>Último login</label>
                  <p>
                    {user?.metadata?.lastSignInTime
                      ? new Date(user.metadata.lastSignInTime).toLocaleString("pt-BR")
                      : "—"}
                  </p>
                </div>
                <div className="pf-field">
                  <label>Criado em</label>
                  <p>
                    {user?.metadata?.creationTime
                      ? new Date(user.metadata.creationTime).toLocaleDateString("pt-BR")
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="pf-divider" />

              <div className="pf-danger-zone">
                <h3>Zona de perigo</h3>
                <button
                  className="pf-btn pf-btn-danger"
                  onClick={handleLogout}
                >
                  <span className="material-symbols-outlined">logout</span>
                  Sair da conta
                </button>
              </div>
              </div>
            </>
          )}
        </div>
      </main>

      <AppFooter />
      <MenuBar />
    </>
  )
}
