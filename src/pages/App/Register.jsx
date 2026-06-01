import { useState } from "react"
import { auth, db } from "../../services/firebase"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
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

    return true
  }

  const handleRegister = async () => {
    if (!validateForm()) return

    setLoading(true)

    try {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      )

      await setDoc(doc(db, "users", userCred.user.uid), {
        name: form.name,
        age: parseInt(form.age),
        type: form.type,
        document: form.document,
        hectares: parseFloat(form.hectares),
        email: form.email,
        createdAt: new Date().toISOString(),
        profileIcon: "👨‍🌾"
      })

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
      let errorMessage = "Erro ao criar conta. Tente novamente."

      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Este email já está em uso."
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
            A sua precisão agrícola no ponto mais alto
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
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
              >
                <option value="">Selecione o tipo</option>
                <option value="CPF">Agricultor Familiar (CPF)</option>
                <option value="PJ">Produtor Rural (CNPJ)</option>
              </select>
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
              <input
                type="number"
                name="hectares"
                value={form.hectares}
                placeholder="Ex: 10.5 hectares"
                min="0"
                step="0.01"
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
              <input
                type="password"
                name="password"
                value={form.password}
                placeholder="Mínimo 6 caracteres"
                onChange={handleChange}
              />
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
