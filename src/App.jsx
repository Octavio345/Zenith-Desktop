
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom"
import { useState, useEffect, useLayoutEffect, useRef } from "react"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { doc, onSnapshot } from "firebase/firestore"

import Intro from "./pages/App/Intro"
import Login from "./pages/App/Login"
import CadastroCompleto from "./pages/App/CadastroCompleto"
import CadastrarFazenda from "./pages/App/CadastroFazenda"
import Home from "./pages/App/Home"
import Profile from "./pages/App/Profile"
import ForgotPassword from "./pages/App/ForgotPassword"
import Explore from "./pages/App/Explore"
import AdminTeamDashboard from "./pages/App/AdminTeamDashboard"
import TeamAccessBlocked from "./pages/App/TeamAccessBlocked"
import { auth, db } from "./services/firebase"
import { getUserAccessProfile, isAccountBlocked, isOperationalRole } from "./services/accessControl"
import { hasFullFeatureAccess } from "./services/featureAccess"
import { InstallAppProvider } from "./contexts/InstallAppContext"


import InstallPrompt from "./components/App/Global/InstallPrompt"
import InstallSuccess from "./components/App/Global/InstallSuccess"
import UpdatePrompt from "./components/App/Global/UpdatePrompt"


import "./App.css"
import "./styles/Global/DesktopMobileTheme.css"

const BRAND_TITLE = "Zenith - Sua precisão agrícola no ponto mais alto"
// No Windows, a janela instalada já exibe o `name` do manifesto.
// Um título visível aqui faria o sistema concatenar os dois textos.
const STANDALONE_TITLE = ""

function AccountRoute({ children }) {
  const [access, setAccess] = useState("loading")

  useEffect(() => {
    let stopProfileListener = null

    const stopAuthListener = onAuthStateChanged(auth, async (user) => {
      if (stopProfileListener) {
        stopProfileListener()
        stopProfileListener = null
      }

      if (!user) {
        setAccess("denied")
        return
      }

      const currentProfile = await getUserAccessProfile(user.uid)
      if (!currentProfile) {
        setAccess("denied")
        try { await signOut(auth) } catch {   }
        return
      }
      stopProfileListener = onSnapshot(doc(db, currentProfile.profileCollection, user.uid), async (profileSnap) => {
        const profile = profileSnap.exists() ? profileSnap.data() : null
        if (!profile || isAccountBlocked(profile)) {
          sessionStorage.setItem(
            "zenithAccessMessage",
            profile ? "Seu acesso foi removido pelo proprietário da fazenda." : "Seu perfil de acesso não está disponível.",
          )
          setAccess("denied")
          try { await signOut(auth) } catch {   }
          return
        }
        setAccess("allowed")
      }, async () => {
        sessionStorage.setItem("zenithAccessMessage", "Não foi possível validar as permissões desta conta.")
        setAccess("denied")
        try { await signOut(auth) } catch {   }
      })
    })

    return () => {
      stopAuthListener()
      if (stopProfileListener) stopProfileListener()
    }
  }, [])

  if (access === "loading") {
    return (
      <div className="access-loader" role="status">
        <img src="/assets/image/Logo-redonda.webp" alt="" />
        <div><strong>Verificando acesso</strong><span>Preparando sua área de trabalho</span></div>
        <i aria-hidden="true" />
      </div>
    )
  }

  return access === "allowed" ? children : <Navigate to="/login" replace />
}

function TeamRoute() {
  const [access, setAccess] = useState("loading")

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) {
      setAccess("denied")
      return
    }
    try {
      const profile = await getUserAccessProfile(user.uid)
      setAccess(isOperationalRole(profile?.role) ? "denied" : hasFullFeatureAccess(user) ? "allowed" : "restricted")
    } catch {
      setAccess("denied")
    }
  }), [])

  if (access === "loading") {
    return (
      <div className="access-loader" role="status">
        <img src="/assets/image/Logo-redonda.webp" alt="" />
        <div><strong>Verificando acesso</strong><span>Preparando sua área de trabalho</span></div>
        <i aria-hidden="true" />
      </div>
    )
  }
  if (access === "restricted") return <TeamAccessBlocked />
  return access === "allowed" ? <AdminTeamDashboard /> : <Navigate to="/home" replace />
}

const resetPageScroll = () => {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
  document.querySelectorAll(".zenith-home, .explore-container, .team-page, .pf-page, .farm-registration").forEach((page) => {
    page.scrollTop = 0
    page.scrollLeft = 0
  })
}

function AppShell() {
  const location = useLocation()
  const noticePreview = import.meta.env.DEV
    ? new URLSearchParams(location.search).get("notice")
    : null
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [showInstallSuccess, setShowInstallSuccess] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [quickLoading, setQuickLoading] = useState(false)
  const firstRoute = useRef(true)

  useEffect(() => {
    let timeout
    const showQuickLoader = () => {
      resetPageScroll()
      setQuickLoading(true)
      window.clearTimeout(timeout)
      timeout = window.setTimeout(() => setQuickLoading(false), 850)
    }
    window.addEventListener("zenith:navigate", showQuickLoader)
    return () => {
      window.removeEventListener("zenith:navigate", showQuickLoader)
      window.clearTimeout(timeout)
    }
  }, [])

  useLayoutEffect(() => {
    const previousRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = "manual"
    resetPageScroll()
    const frame = window.requestAnimationFrame(resetPageScroll)

    return () => {
      window.cancelAnimationFrame(frame)
      window.history.scrollRestoration = previousRestoration
    }
  }, [location.key])

  useEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false
      return
    }
    setQuickLoading(true)
    const routeTimeout = window.setTimeout(() => setQuickLoading(false), 900)
    return () => window.clearTimeout(routeTimeout)
  }, [location.key])



  useEffect(() => {
    const userAgent = navigator.userAgent
    setIsIOS(/iPhone|iPad|iPod/i.test(userAgent))
    setIsAndroid(/Android/i.test(userAgent))

    const displayMode = window.matchMedia("(display-mode: standalone)")
    const updateInstalledState = () => {
      const isStandalone = displayMode.matches || window.navigator.standalone === true
      setIsInstalled(isStandalone)
      document.title = isStandalone ? STANDALONE_TITLE : BRAND_TITLE
    }
    updateInstalledState()

    const params = new URLSearchParams(window.location.search)
    const shouldShowInstall = params.get("install") === "true"
    let promptTimer = null
    if (shouldShowInstall && !displayMode.matches) {
      promptTimer = window.setTimeout(() => setShowInstallPrompt(true), 700)
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setDeferredPrompt(event)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setShowInstallSuccess(true)
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)
    displayMode.addEventListener?.("change", updateInstalledState)

    return () => {
      window.clearTimeout(promptTimer)
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
      displayMode.removeEventListener?.("change", updateInstalledState)
      document.title = BRAND_TITLE
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setShowInstallPrompt(true)
      return
    }

    setShowInstallPrompt(false)
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  const requestInstall = () => {
    if (isInstalled) return
    handleInstall()
  }

  return (
          <InstallAppProvider value={{ isInstalled, canInstall: Boolean(deferredPrompt), requestInstall }}>

            <UpdatePrompt preview={noticePreview} />

            {showInstallPrompt && !isInstalled && (
              <InstallPrompt
                onInstall={handleInstall}
                onClose={() => setShowInstallPrompt(false)}
                isIOS={isIOS}
                isAndroid={isAndroid}
                isDesktop={!isIOS && !isAndroid}
                hasPrompt={!!deferredPrompt}
              />
            )}


            {(showInstallSuccess || noticePreview === "installed") && (
              <InstallSuccess
                onClose={() => setShowInstallSuccess(false)}
                isIOS={isIOS}
                isAndroid={isAndroid}
              />
            )}

            <Routes location={location}>
              <Route path="/" element={<Intro />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<CadastroCompleto />} />
              <Route path="/cadastrar-fazenda" element={<AccountRoute><CadastrarFazenda /></AccountRoute>} />
              <Route path="/home" element={<AccountRoute><Home /></AccountRoute>} />
              <Route path="/profile" element={<AccountRoute><Profile /></AccountRoute>} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/explore" element={<AccountRoute><Explore /></AccountRoute>} />
              <Route path="/equipe" element={<AccountRoute><TeamRoute /></AccountRoute>} />
              <Route path="/admin/team" element={<AccountRoute><TeamRoute /></AccountRoute>} />
            </Routes>
            {quickLoading && (
              <div className="route-quick-loader" role="status" aria-label="Abrindo página">
                <div>
                  <span className="material-symbols-outlined">eco</span>
                  <i aria-hidden="true" />
                </div>
                <strong>Zenith</strong>
              </div>
            )}
          </InstallAppProvider>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

export default App
