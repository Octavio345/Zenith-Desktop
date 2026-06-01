import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { auth } from "../../services/firebase"
import { signInWithEmailAndPassword } from "firebase/auth"
import { FaEye, FaEyeSlash } from "react-icons/fa"
import "../../styles/App/Login.css"

export default function Login({ setAppLoading }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [alertMessage, setAlertMessage] = useState({ type: "", text: "" })
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const user = auth.currentUser
      if (user) {
        setAppLoading(true)
        setTimeout(() => navigate("/home"), 2000)
      } else {
        const rememberedEmail = localStorage.getItem("rememberedEmail")
        if (rememberedEmail) {
          setEmail(rememberedEmail)
          setRememberMe(true)
        }
      }
    }
    checkAuth()
  }, [navigate, setAppLoading])

  const togglePasswordVisibility = () => setShowPassword(!showPassword)

  const handleLogin = async () => {
    if (!email || !password) {
      setAlertMessage({ type: "error", text: "Preencha todos os campos para acessar." })
      return
    }
    setLoading(true)
    setAlertMessage({ type: "", text: "" })
    try {
      await signInWithEmailAndPassword(auth, email, password)
      if (rememberMe) localStorage.setItem("rememberedEmail", email)
      else localStorage.removeItem("rememberedEmail")
      setAlertMessage({ type: "success", text: "Acesso autorizado. Inicializando sistema..." })
      setAppLoading(true)
      setTimeout(() => navigate("/home"), 2000)
    } catch (error) {
      let errorMessage = "Erro na autenticação. Verifique seus dados."
      switch (error.code) {
        case "auth/user-not-found": errorMessage = "Usuário não encontrado."; break
        case "auth/wrong-password": errorMessage = "Senha incorreta."; break
        case "auth/invalid-email": errorMessage = "Email inválido."; break
        case "auth/too-many-requests": errorMessage = "Muitas tentativas. Aguarde um momento."; break
        case "auth/network-request-failed": errorMessage = "Falha de conexão com o servidor."; break
        default: errorMessage = "Erro ao fazer login. Tente novamente."
      }
      setAlertMessage({ type: "error", text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => { if (e.key === "Enter") handleLogin() }

  return (
    <div className="auth-shell">
      <div className="auth-bg-grid" />
      <div className="auth-bg-sphere auth-bg-sphere-1" />
      <div className="auth-bg-sphere auth-bg-sphere-2" />
      <div className="auth-bg-noise" />

      <aside className="auth-side">
        <div className="auth-brand">
          <div className="auth-brand-mark">
            <span className="auth-brand-dot" />
            ZENITH
          </div>

          <p className="auth-brand-tag">
            A sua precisão agrícola no ponto mais alto
          </p>
        </div>

        <div className="auth-side-info">
          <h1 className="auth-side-title">
            Controle total da sua <span className="hl">operação agrícola</span> em tempo real.
          </h1>
          <p className="auth-side-desc">
            Monitore produtividade, clima, insumos e equipamentos através de uma única interface.
          </p>

          <ul className="auth-feature-list">
            <li><span /> Telemetria de campo em tempo real</li>
            <li><span /> Inteligência preditiva de safra</li>
            <li><span /> Gestão multi-fazenda integrada</li>
          </ul>
        </div>

        <div className="auth-side-foot">
          <div><strong>99.98%</strong><span>uptime</span></div>
          <div><strong>12ms</strong><span>latência</span></div>
          <div><strong>AES-256</strong><span>criptografia</span></div>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-card-head">
            <h2>Acessar painel</h2>
            <p>Entre com suas credenciais para continuar.</p>
          </div>

          <div className="auth-form">
            <div className="auth-field">
              <label>Email</label>
              <input
                type="email"
                placeholder="voce@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
              />
            </div>

            <div className="auth-field">
              <label>Senha</label>
              <div className="auth-password">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button type="button" onClick={togglePasswordVisibility} className="auth-eye">
                  {showPassword ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>
            </div>

            <div className="auth-row">
              <label className="auth-check">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Manter conectado</span>
              </label>
              <a href="/forgot-password" className="auth-link">Esqueceu a senha?</a>
            </div>

            {alertMessage.text && (
              <div className={`auth-alert ${alertMessage.type}`}>{alertMessage.text}</div>
            )}

            <button className="auth-btn primary" onClick={handleLogin} disabled={loading}>
              {loading ? <><span className="auth-spinner" /> Autenticando...</> : "Entrar →"}
            </button>
          </div>

          <div className="auth-divider"><span>OU</span></div>

          <div className="auth-footer">
            Ainda não tem conta?
            <a href="/register"> Criar acesso</a>
          </div>

          <div className="auth-status">
            <span className="auth-pulse" />
            Sistema online · servidores operando normalmente
          </div>
        </div>
      </main>
    </div>
  )
}
