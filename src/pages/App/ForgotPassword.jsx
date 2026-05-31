import { useState } from "react"
import { auth } from "../../services/firebase"
import { sendPasswordResetEmail } from "firebase/auth"
import { useNavigate } from "react-router-dom"
import "../../styles/App/Login.css"

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [alertMessage, setAlertMessage] = useState({ type: "", text: "" })

  const handleResetPassword = async () => {
    if (!email) {
      setAlertMessage({
        type: "error",
        text: "Digite seu email para recuperar a senha! 📧"
      })
      return
    }

    setLoading(true)
    setAlertMessage({ type: "", text: "" })

    try {
      await sendPasswordResetEmail(auth, email)
      
      setAlertMessage({
        type: "success",
        text: "Email de recuperação enviado! Verifique sua caixa de entrada. 📨"
      })

      setTimeout(() => {
        navigate("/login")
      }, 3000)

    } catch (error) {
      let errorMessage = "Erro ao enviar email de recuperação!"

      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = "Usuário não encontrado com este email! 🌱"
          break
        case 'auth/invalid-email':
          errorMessage = "Email inválido! Digite um email válido."
          break
        case 'auth/too-many-requests':
          errorMessage = "Muitas tentativas! Aguarde um momento. ⏳"
          break
        default:
          errorMessage = "Erro ao enviar email. Tente novamente."
      }

      setAlertMessage({ type: "error", text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleResetPassword()
    }
  }

  return (
    <div className="login-container">
      <div className="login-background-layer login-background-layer-1"></div>
      <div className="login-gradient-sphere login-gradient-sphere-1"></div>
      <div className="login-gradient-sphere login-gradient-sphere-2"></div>
      <div className="login-grid-pattern"></div>

      <div className="login-card">
        <div className="login-header">
          <h2>Recuperar Senha</h2>
          <p className="login-subtitle">
            Enviaremos um link para seu email
          </p>
        </div>

        <div className="login-form">
          <div className="input-group-login">
            <label>Email</label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
          </div>

          {alertMessage.text && (
            <div className={`alert-message-login ${alertMessage.type}`}>
              {alertMessage.text}
            </div>
          )}

          <button
            className="login-button"
            onClick={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner-login"></span>
                Enviando...
              </>
            ) : (
              "Enviar email de recuperação"
            )}
          </button>

          <button
            className="login-button"
            onClick={() => navigate("/login")}
            style={{
              background: "transparent",
              border: "2px solid #F5B342",
              marginTop: "10px",
              boxShadow: "none"
            }}
          >
            Voltar para o Login
          </button>
        </div>
      </div>
    </div>
  )
}