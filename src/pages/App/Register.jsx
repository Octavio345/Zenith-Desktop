import { useState } from "react"
import { auth } from "../../services/firebase"
import { createUserWithEmailAndPassword, deleteUser } from "firebase/auth"
import CustomSelect from "../../components/App/Global/CustomSelect"
import HectareInput from "../../components/App/Global/HectareInput"
import { isValidHectares, parseHectaresInput, sanitizeHectaresInput } from "../../utils/hectares"
import { accountIdentifierMessage, createProfileWithUniqueIdentifiers } from "../../services/accountIdentity"
import "../../styles/App/Register.css"

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    age: "",
    type: "",
    document: "",
    hectares: "",
    email: "",
    password: ""
  })

  const [loading, setLoading] = useState(false)
  const [alertMessage, setAlertMessage] = useState({ type: "", text: "" })
  const [showPassword, setShowPassword] = useState(false)

  const formatDocument = (value, type) => {
    const digits = value.replace(/\D/g, "").slice(0, type === "PJ" ? 14 : 11)
    if (type === "PJ") {
      return digits
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2")
    }
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === "type") {
      setForm({ ...form, type: value, document: "" })
    } else {
      const formatted = name === "document"
        ? formatDocument(value, form.type)
        : name === "hectares" ? sanitizeHectaresInput(value) : value
      setForm({ ...form, [name]: formatted })
    }
    setAlertMessage({ type: "", text: "" })
  }

  const validateForm = () => {
    if (!form.name || !form.age || !form.type || !form.document || !form.hectares || !form.email || !form.password) {
      setAlertMessage({ type: "error", text: "Preencha todos os campos para criar sua conta." })
      return false
    }

    if (form.password.length < 6) {
      setAlertMessage({ type: "error", text: "A senha deve ter pelo menos 6 caracteres." })
      return false
    }
    if (!isValidHectares(form.hectares)) {
      setAlertMessage({ type: "error", text: "Informe uma área maior que zero." })
      return false
    }

    return true
  }

  const handleRegister = async () => {
    if (!validateForm()) return

    setLoading(true)
    let createdUser = null

    try {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      )
      createdUser = userCred.user

      await createProfileWithUniqueIdentifiers({ profileCollection: "owners", userId: userCred.user.uid, profileData: {
        name: form.name,
        age: parseInt(form.age),
        type: form.type,
        document: form.document.replace(/\D/g, ""),
        hectares: parseHectaresInput(form.hectares),
        email: form.email,
        createdAt: new Date().toISOString(),
        profileIcon: "👨‍🌾"
      } })

      setAlertMessage({ type: "success", text: "Conta criada com sucesso!" })

      setForm({
        name: "",
        age: "",
        type: "",
        document: "",
        hectares: "",
        email: "",
        password: ""
      })

      setTimeout(() => {
        window.location.href = "/login"
      }, 2000)
    } catch (error) {
      if (createdUser && auth.currentUser?.uid === createdUser.uid) {
        try { await deleteUser(createdUser) } catch { /* O perfil não foi criado; a limpeza pode ser repetida pelo administrador. */ }
      }
      let errorMessage = "Erro ao criar conta. Tente novamente."

      if (accountIdentifierMessage(error)) {
        errorMessage = accountIdentifierMessage(error)
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Email inválido."
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Senha muito fraca."
      }

      setAlertMessage({ type: "error", text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-container">
      <div className="register-background-layer register-background-layer-1"></div>
      <div className="register-background-layer register-background-layer-2"></div>
      <div className="register-background-overlay"></div>

      <div className="register-gradient-sphere register-gradient-sphere-1"></div>
      <div className="register-gradient-sphere register-gradient-sphere-2"></div>

      <div className="register-grid-pattern"></div>

      <div className="register-content">
        <div className="register-brand">
          <div className="register-brand-logo">
            <span className="register-brand-dot"></span>
            ZENITH
          </div>

          <p className="register-brand-subtitle">
            Sua precisão agrícola no ponto mais alto
          </p>
        </div>

        <div className="register-card">
          <div className="register-card-glow"></div>
          <div className="register-card-pattern"></div>

          <div className="register-header">
            <h2>Criar conta</h2>
            <p>Cadastre seus dados para acessar a plataforma.</p>
          </div>

          <div className="register-form">
            <div className="input-group-register">
              <label>Nome completo</label>
              <input
                name="name"
                value={form.name}
                placeholder="Digite seu nome completo"
                onChange={handleChange}
              />
            </div>

            <div className="input-group-register">
              <label>Idade</label>
              <input
                type="number"
                name="age"
                value={form.age}
                placeholder="Sua idade"
                min="0"
                max="120"
                onChange={handleChange}
              />
            </div>

            <div className="input-group-register">
              <label>Tipo de propriedade</label>
              <CustomSelect
                name="type"
                value={form.type}
                onChange={handleChange}
                placeholder="Selecione o tipo"
                options={[
                  { value: "CPF", label: "Agricultor Familiar (CPF)" },
                  { value: "PJ", label: "Produtor Rural (CNPJ)" },
                ]}
                className="register-custom-select"
              />
            </div>

            {form.type && (
              <div className="input-group-register">
                <label>{form.type === "CPF" ? "CPF do Produtor" : "CNPJ da Propriedade"}</label>
                <input
                  name="document"
                  value={form.document}
                  placeholder={form.type === "CPF" ? "000.000.000-00" : "00.000.000/0000-00"}
                  maxLength={form.type === "CPF" ? 14 : 18}
                  onChange={handleChange}
                />
              </div>
            )}

            <div className="input-group-register">
              <label>Hectares</label>
              <HectareInput
                name="hectares"
                value={form.hectares}
                placeholder="Ex.: 125,5"
                onChange={handleChange}
              />
            </div>

            <div className="input-group-register">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                placeholder="seu@email.com"
                onChange={handleChange}
              />
            </div>

            <div className="input-group-register">
              <label>Senha</label>
              <div className="register-password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  placeholder="Mínimo 6 caracteres"
                  onChange={handleChange}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">{showPassword ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
            </div>

            {alertMessage.text && (
              <div className={`alert-message-register ${alertMessage.type}`}>
                {alertMessage.text}
              </div>
            )}

            <button
              className="register-button"
              onClick={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading-spinner-register"></span>
                  Criando conta...
                </>
              ) : (
                "Criar conta →"
              )}
            </button>

            <div className="login-link">
              <span>Já tem uma conta?</span>
              <a href="/login">Fazer login</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
