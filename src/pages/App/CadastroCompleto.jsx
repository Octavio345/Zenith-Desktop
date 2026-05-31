import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db } from "../../services/firebase"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc, addDoc, collection } from "firebase/firestore"
import "../../styles/App/CadastroCompleto.css"

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

export default function CadastroCompleto() {
  const navigate = useNavigate()
  const [etapa, setEtapa] = useState(1)
  const [loading, setLoading] = useState(false)
  const [alertMessage, setAlertMessage] = useState({ type: "", text: "" })
  const [userId, setUserId] = useState(null)

  const [userData, setUserData] = useState({
    name: "", age: "", type: "", document: "", email: "", password: "", plan: "agro-vision"
  })
  const [farmData, setFarmData] = useState({
    name: "", tipo_proprietario: "", data_aquisicao: "", cep: "",
    bairro: "", municipio: "", uf: "", area_total: "", telefone: "", plantacao: ""
  })

  const buscarCEP = async (cep) => {
    const cepLimpo = cep.replace(/\D/g, "")
    if (cepLimpo.length !== 8) return
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setFarmData((prev) => ({
          ...prev,
          bairro: data.bairro || "",
          municipio: data.localidade || "",
          uf: data.uf || ""
        }))
      }
    } catch (e) { console.error(e) }
  }

  const handleUserChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value })
    setAlertMessage({ type: "", text: "" })
  }
  const handleFarmChange = (e) => {
    setFarmData({ ...farmData, [e.target.name]: e.target.value })
  }

  const validateUserData = () => {
    if (!userData.name || !userData.age || !userData.type || !userData.document || !userData.email || !userData.password || !userData.plan) {
      setAlertMessage({ type: "error", text: "Preencha todos os campos do produtor." })
      return false
    }
    if (userData.password.length < 6) {
      setAlertMessage({ type: "error", text: "A senha deve ter pelo menos 6 caracteres." })
      return false
    }
    return true
  }
  const validateFarmData = () => {
    const f = farmData
    if (!f.name || !f.tipo_proprietario || !f.data_aquisicao || !f.cep || !f.bairro || !f.municipio || !f.uf || !f.area_total || !f.telefone || !f.plantacao) {
      setAlertMessage({ type: "error", text: "Preencha todos os dados da fazenda." })
      return false
    }
    return true
  }

  const handleCreateUser = async () => {
    if (!validateUserData()) return
    setLoading(true)
    try {
      const selectedPlan = PLAN_OPTIONS.find((plan) => plan.id === userData.plan) || PLAN_OPTIONS[0]
      const userCred = await createUserWithEmailAndPassword(auth, userData.email, userData.password)
      await setDoc(doc(db, "users", userCred.user.uid), {
        name: userData.name,
        age: parseInt(userData.age),
        type: userData.type,
        document: userData.document,
        email: userData.email,
        plan: selectedPlan.id,
        planName: selectedPlan.name,
        hectares: 0,
        createdAt: new Date().toISOString(),
        profileIcon: "agriculture"
      })
      setUserId(userCred.user.uid)
      setAlertMessage({ type: "success", text: "Conta criada. Cadastre agora sua fazenda." })
      setTimeout(() => { setEtapa(2); setAlertMessage({ type:"", text:"" }) }, 1500)
    } catch (error) {
      let msg = "Erro no cadastro. Tente novamente."
      if (error.code === "auth/email-already-in-use") msg = "Este email já está cadastrado."
      setAlertMessage({ type: "error", text: msg })
    } finally { setLoading(false) }
  }

  const handleSaveFarm = async () => {
    if (!validateFarmData()) return
    setLoading(true)
    try {
      await addDoc(collection(db, "farms"), {
        ...farmData,
        ownerId: userId,
        ownerName: userData.name,
        createdAt: new Date()
      })
      await setDoc(doc(db, "users", userId), { hectares: parseFloat(farmData.area_total) }, { merge: true })
      setAlertMessage({ type: "success", text: "Fazenda cadastrada com sucesso." })
      setTimeout(() => navigate("/home"), 2000)
    } catch (error) {
      console.error(error)
      setAlertMessage({ type: "error", text: "Erro ao cadastrar fazenda." })
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
            <span className="cc-dot" />
            ZENITH
          </div>
          <span className="cc-mono">// ONBOARDING / {etapa === 1 ? "STEP_01_PRODUCER" : "STEP_02_FARM"}</span>
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
                <h2>Cadastre o produtor</h2>
                <p>Informações usadas para identificar o titular da operação.</p>
              </div>

              <div className="cc-form">
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
                    <select name="type" value={userData.type} onChange={handleUserChange}>
                      <option value="">Selecione</option>
                      <option value="CPF">Pessoa Física (CPF)</option>
                      <option value="PJ">Pessoa Jurídica (CNPJ)</option>
                    </select>
                  </div>
                </div>

                {userData.type && (
                  <div className="cc-field">
                    <label>{userData.type === "CPF" ? "CPF" : "CNPJ"}</label>
                    <input
                      type="text" name="document" value={userData.document}
                      onChange={(e) => handleUserChange({ target: { name: "document", value: formatDocument(e.target.value, userData.type) } })}
                      placeholder={userData.type === "CPF" ? "000.000.000-00" : "00.000.000/0000-00"}
                    />
                  </div>
                )}

                <div className="cc-row">
                  <div className="cc-field">
                    <label>Email</label>
                    <input type="email" name="email" value={userData.email} onChange={handleUserChange} placeholder="voce@empresa.com"/>
                  </div>
                  <div className="cc-field">
                    <label>Senha</label>
                    <input type="password" name="password" value={userData.password} onChange={handleUserChange} placeholder="Mínimo 6 caracteres"/>
                  </div>
                </div>

                <div className="cc-plan-picker">
                  <div className="cc-plan-title">
                    <span>Escolha seu plano</span>
                    <small>Voce pode alterar depois no perfil.</small>
                  </div>

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
                    <label>Tipo proprietário</label>
                    <select name="tipo_proprietario" value={farmData.tipo_proprietario} onChange={handleFarmChange}>
                      <option value="">Selecione</option>
                      <option value="PF">Pessoa Física</option>
                      <option value="PJ">Pessoa Jurídica</option>
                    </select>
                  </div>
                  <div className="cc-field">
                    <label>Data de aquisição</label>
                    <input type="date" name="data_aquisicao" value={farmData.data_aquisicao} onChange={handleFarmChange}/>
                  </div>
                </div>

                <div className="cc-row">
                  <div className="cc-field">
                    <label>CEP</label>
                    <input type="text" name="cep" value={farmData.cep}
                      onChange={(e) => { handleFarmChange(e); buscarCEP(e.target.value) }} placeholder="00000-000"/>
                  </div>
                  <div className="cc-field">
                    <label>UF</label>
                    <input type="text" name="uf" value={farmData.uf} onChange={handleFarmChange} maxLength="2" placeholder="SP"/>
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

                <div className="cc-row">
                  <div className="cc-field">
                    <label>Área total (ha)</label>
                    <select name="area_total" value={farmData.area_total} onChange={handleFarmChange}>
                      <option value="">Selecione</option>
                      <option value="1-6">1 – 6 ha</option>
                      <option value="7-12">7 – 12 ha</option>
                      <option value="13-20">13 – 20 ha</option>
                      <option value="21-29">21 – 29 ha</option>
                      <option value="30-40">30 – 40 ha</option>
                    </select>
                  </div>
                  <div className="cc-field">
                    <label>Telefone</label>
                    <input type="text" name="telefone" value={farmData.telefone} onChange={handleFarmChange} placeholder="(00) 00000-0000"/>
                  </div>
                </div>

                <div className="cc-field">
                  <label>Principal plantação</label>
                  <select name="plantacao" value={farmData.plantacao} onChange={handleFarmChange}>
                    <option value="">Selecione</option>
                    <option value="Soja">Soja</option>
                    <option value="Tomate">Tomate</option>
                    <option value="Café">Café</option>
                    <option value="Milho">Milho</option>
                    <option value="Feijão">Feijão</option>
                  </select>
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
