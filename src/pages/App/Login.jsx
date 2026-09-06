import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db } from "../../services/firebase"
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { FaEye, FaEyeSlash, FaGoogle } from "react-icons/fa"
import { ACCOUNT_ROLES, getUserAccessProfile, isAccountBlocked, isOperationalRole, normalizeRole } from "../../services/accessControl"
import { protectCurrentIdentityData } from "../../services/accountIdentity"
import "../../styles/App/Login.css"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [alertMessage, setAlertMessage] = useState({ type: "", text: "" })
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [accessType, setAccessType] = useState(() => localStorage.getItem("zenithAccessType") || "owner")

  useEffect(() => {
    const checkAuth = async () => {
      const accessMessage = sessionStorage.getItem("zenithAccessMessage")
      if (accessMessage) {
        sessionStorage.removeItem("zenithAccessMessage")
        setAlertMessage({ type: "error", text: accessMessage })
      }
      const user = auth.currentUser
      if (user) {
        try {
          const profile = await getUserAccessProfile(user.uid)
          if (isAccountBlocked(profile)) {
            await signOut(auth)
            setAlertMessage({ type: "error", text: "Seu acesso foi removido pelo proprietário da fazenda." })
            return
          }
          await protectCurrentIdentityData(profile, user.uid).catch((error) => console.error("Não foi possível proteger dados antigos:", error))
          navigate("/home", { replace: true })
        } catch {
          await signOut(auth)
          setAlertMessage({ type: "error", text: "Não foi possível validar seu acesso. Entre novamente." })
        }
      } else {
        const rememberedEmail = localStorage.getItem("rememberedEmail")
        if (rememberedEmail) {
          setEmail(rememberedEmail)
          setRememberMe(true)
        }
      }
    }
    checkAuth()
  }, [navigate])

  const togglePasswordVisibility = () => setShowPassword(!showPassword)

  const validateAccountRole = async (user) => {
    const profile = await getUserAccessProfile(user.uid)
    if (isAccountBlocked(profile)) {
      await signOut(auth)
      const blockedError = new Error("Acesso removido pelo proprietário.")
      blockedError.code = "auth/account-blocked"
      throw blockedError
    }
    const actualRole = normalizeRole(profile?.role)
    const selectedEmployee = accessType === "employee"
    if (selectedEmployee !== isOperationalRole(actualRole)) {
      await signOut(auth)
      const roleError = new Error("A modalidade escolhida não corresponde a esta conta.")
      roleError.code = "auth/role-mismatch"
      throw roleError
    }
    return profile
  }

  const handleLogin = async () => {
    if (!email || !password) {
      setAlertMessage({ type: "error", text: "Preencha todos os campos para acessar." })
      return
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setAlertMessage({ type: "error", text: "Informe um email válido, como nome@empresa.com." })
      return
    }
    setLoading(true)
    setAlertMessage({ type: "", text: "" })
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      const profile = await validateAccountRole(credential.user)
      await protectCurrentIdentityData(profile, credential.user.uid).catch((error) => console.error("Não foi possível proteger dados antigos:", error))
      if (rememberMe) localStorage.setItem("rememberedEmail", email)
      else localStorage.removeItem("rememberedEmail")
      localStorage.setItem("zenithAccessType", accessType)
      navigate("/home", { replace: true })
    } catch (error) {
      let errorMessage = "Erro na autenticação. Verifique seus dados."
      switch (error.code) {
        case "auth/user-not-found": errorMessage = "Usuário não encontrado."; break
        case "auth/wrong-password": errorMessage = "Senha incorreta."; break
        case "auth/invalid-email": errorMessage = "Email inválido."; break
        case "auth/too-many-requests": errorMessage = "Muitas tentativas. Aguarde um momento."; break
        case "auth/network-request-failed": errorMessage = "Falha de conexão com o servidor."; break
        case "auth/role-mismatch": errorMessage = "Escolha o acesso correto: proprietário/gestor ou funcionário."; break
        case "auth/account-blocked": errorMessage = "Seu acesso foi removido pelo proprietário da fazenda."; break
        default: errorMessage = "Erro ao fazer login. Tente novamente."
      }
      setAlertMessage({ type: "error", text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setAlertMessage({ type: "", text: "" })
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: "select_account" })
      const credential = await signInWithPopup(auth, provider)
      const profileRef = doc(db, "owners", credential.user.uid)
      const existingProfile = await getUserAccessProfile(credential.user.uid)

      if (!existingProfile) {
        if (accessType === "employee") {
          await signOut(auth)
          const employeeError = new Error("Funcionário sem vínculo")
          employeeError.code = "auth/employee-profile-required"
          throw employeeError
        }
        await setDoc(profileRef, {
          name: credential.user.displayName || "Proprietário",
          email: credential.user.email || "",
          role: ACCOUNT_ROLES.ADMIN,
          plan: "agro-vision",
          planName: "Agro Vision",
          hectares: 0,
          profileIcon: "agriculture",
          provider: "google",
          createdAt: new Date().toISOString(),
        })
      }

      const profile = await validateAccountRole(credential.user)
      await protectCurrentIdentityData(profile, credential.user.uid).catch((error) => console.error("Não foi possível proteger dados antigos:", error))
      localStorage.setItem("zenithAccessType", accessType)
      navigate("/home", { replace: true })
    } catch (error) {
      if (auth.currentUser) {
        try { await signOut(auth) } catch {   }
      }
      let message = "Não foi possível entrar com o Google. Tente novamente."
      if (error.code === "auth/popup-closed-by-user") message = "A janela do Google foi fechada antes da conclusão."
      if (error.code === "auth/popup-blocked") message = "O navegador bloqueou a janela do Google. Autorize pop-ups e tente novamente."
      if (error.code === "auth/role-mismatch") message = "Escolha o acesso correto para esta conta Google."
      if (error.code === "auth/employee-profile-required") message = "Seu email Google ainda não está vinculado a uma equipe. Peça ao gestor para cadastrar seu acesso primeiro."
      if (error.code === "auth/account-blocked") message = "Seu acesso foi removido pelo proprietário da fazenda."
      setAlertMessage({ type: "error", text: message })
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
            <img src="/assets/image/Logo-redonda.webp" alt="" />
            <span><strong>Zenith</strong><small>Sua precisão agrícola no ponto mais alto</small></span>
          </div>
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

      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-card-head">
            <div className="auth-card-logo"><img src="/assets/image/Logo-redonda.webp" alt="" /><span>ZENITH</span></div>
            <h2>Acessar painel</h2>
            <p>Entre com suas credenciais para continuar.</p>
          </div>

          <div className="auth-form">
            <div className="auth-access-switch" aria-label="Tipo de acesso">
              <button type="button" className={accessType === "owner" ? "active" : ""} onClick={() => setAccessType("owner")}>
                <span className="material-symbols-outlined">admin_panel_settings</span>
                <span><strong>Proprietário / gestor</strong><small>Administração completa</small></span>
              </button>
              <button type="button" className={accessType === "employee" ? "active" : ""} onClick={() => setAccessType("employee")}>
                <span className="material-symbols-outlined">badge</span>
                <span><strong>Funcionário</strong><small>Acesso operacional</small></span>
              </button>
            </div>
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

          <button className="auth-btn google" type="button" onClick={handleGoogleLogin} disabled={loading}>
            <FaGoogle aria-hidden="true" />
            Entrar com Google
          </button>

          <div className="auth-footer">
            É proprietário e ainda não tem conta?
            <a href="/register"> Criar cadastro</a>
          </div>

        </div>
      </main>
    </div>
  )
}
