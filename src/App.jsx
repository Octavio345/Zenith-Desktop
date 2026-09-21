
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
import { DEFAULT_APP_LANGUAGE, getAppLanguage, getAppSystemCopy, hasStoredAppLanguage, persistAppLanguage } from "./constants/appLanguages"


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
  const systemCopy = getAppSystemCopy()

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
        const profileLanguage = profile?.language || DEFAULT_APP_LANGUAGE
        if (!hasStoredAppLanguage() && profileLanguage !== getAppLanguage()) {
          persistAppLanguage(profileLanguage)
          window.location.reload()
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
        <div translate="no" className="notranslate"><strong>{systemCopy.verifyingAccess}</strong><span>{systemCopy.preparingWorkspace}</span></div>
        <i aria-hidden="true" />
      </div>
    )
  }

  return access === "allowed" ? children : <Navigate to="/login" replace />
}

function TeamRoute() {
  const [access, setAccess] = useState("loading")
  const systemCopy = getAppSystemCopy()

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
        <div translate="no" className="notranslate"><strong>{systemCopy.verifyingAccess}</strong><span>{systemCopy.preparingWorkspace}</span></div>
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
  const [appLanguage, setAppLanguage] = useState(() => getAppLanguage())
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
  const [translationPending, setTranslationPending] = useState(() => getAppLanguage() !== DEFAULT_APP_LANGUAGE)
  const firstRoute = useRef(true)
  const systemCopy = getAppSystemCopy(appLanguage)

  useEffect(() => {
    const handleLanguageChange = (event) => {
      const nextLanguage = event.detail?.language || getAppLanguage()
      setTranslationPending(nextLanguage !== DEFAULT_APP_LANGUAGE)
      setAppLanguage(nextLanguage)
    }
    window.addEventListener("zenith:language-change", handleLanguageChange)
    return () => window.removeEventListener("zenith:language-change", handleLanguageChange)
  }, [])

  useEffect(() => {
    let timeout
    const showQuickLoader = () => {
      resetPageScroll()
      setQuickLoading(true)
      window.clearTimeout(timeout)
      timeout = window.setTimeout(
        () => setQuickLoading(false),
        getAppLanguage() === DEFAULT_APP_LANGUAGE ? 850 : 2300,
      )
    }
    window.addEventListener("zenith:navigate", showQuickLoader)
    return () => {
      window.removeEventListener("zenith:navigate", showQuickLoader)
      window.clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    const language = appLanguage
    document.documentElement.lang = language
    document.documentElement.setAttribute("translate", "yes")
    document.body?.setAttribute("translate", "yes")
    if (language === "pt-BR") return undefined

    const mountId = "google_translate_element"
    const googleLanguage = language === "es-ES" ? "es" : "en"
    let applyTimer = null
    let retryTimer = null
    let resumeTimer = null
    let brandTimer = null
    let languageSwitchTimer = null
    let isApplying = false
    let observer = null

    const restoreBrandName = () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      const textNodes = []
      while (walker.nextNode()) textNodes.push(walker.currentNode)
      textNodes.forEach((node) => {
        const parent = node.parentElement
        if (!parent || parent.closest("script, style, textarea")) return
        if (/\bcenit\b/i.test(node.nodeValue || "")) {
          node.nodeValue = node.nodeValue.replace(/\bcenit\b/gi, (match) => (
            match === match.toUpperCase() ? "ZENITH" : "Zenith"
          ))
        }
      })
    }

    const protectBrandAndIcons = () => {
      const icons = [...document.querySelectorAll(".material-symbols-outlined")]
      const iconsWithoutSize = icons.filter((icon) => {
        const savedSize = Number.parseFloat(icon.style.getPropertyValue("--zenith-icon-size"))
        return !Number.isFinite(savedSize) || savedSize <= 0
      })
      const currentDocumentLanguage = document.documentElement.lang

      // A regra visual de inglês/espanhol zera apenas o texto interno do
      // ligature. Medimos o tamanho no estilo-base antes de criar o fallback.
      if (iconsWithoutSize.length) document.documentElement.lang = DEFAULT_APP_LANGUAGE
      iconsWithoutSize.forEach((icon) => {
        const measuredSize = window.getComputedStyle(icon).fontSize
        icon.style.setProperty(
          "--zenith-icon-size",
          Number.parseFloat(measuredSize) > 0 ? measuredSize : "24px",
        )
      })
      if (iconsWithoutSize.length) document.documentElement.lang = currentDocumentLanguage

      icons.forEach((icon) => {
        if (!icon.dataset.icon) icon.dataset.icon = icon.textContent.trim()
        icon.setAttribute("translate", "no")
        icon.classList.add("notranslate")
        icon.setAttribute("aria-hidden", "true")
      })
      document.querySelectorAll("body *").forEach((element) => {
        if (element.children.length === 0 && /^(zenith)$/i.test(element.textContent.trim())) {
          element.setAttribute("translate", "no")
          element.classList.add("notranslate")
        }
      })
    }

    const observeDocument = () => {
      if (!observer) return
      observer.observe(document.body, { childList: true, subtree: true })
    }

    const forceTranslation = (hardRefresh = false) => {
      const selector = document.querySelector(".goog-te-combo")
      if (!selector) {
        window.clearTimeout(retryTimer)
        retryTimer = window.setTimeout(() => forceTranslation(hardRefresh), 250)
        return false
      }

      isApplying = true
      observer?.disconnect()
      window.clearTimeout(resumeTimer)
      window.clearTimeout(brandTimer)
      window.clearTimeout(languageSwitchTimer)

      const applyTargetLanguage = () => {
        selector.value = googleLanguage
        selector.dispatchEvent(new Event("change", { bubbles: true }))
        resumeTimer = window.setTimeout(() => {
          protectBrandAndIcons()
          restoreBrandName()
          isApplying = false
          setTranslationPending(false)
          observeDocument()
        }, 1750)
        brandTimer = window.setTimeout(restoreBrandName, 2900)
      }

      if (hardRefresh && selector.value === googleLanguage) {
        // O widget ignora uma seleção repetida. Usamos o outro idioma como
        // ponte, coberto pelo loader, e então reaplicamos o idioma escolhido.
        selector.value = googleLanguage === "en" ? "es" : "en"
        selector.dispatchEvent(new Event("change", { bubbles: true }))
        languageSwitchTimer = window.setTimeout(applyTargetLanguage, 520)
      } else {
        applyTargetLanguage()
      }
      return true
    }

    const scheduleTranslation = (force = false, hardRefresh = false) => {
      window.clearTimeout(applyTimer)
      applyTimer = window.setTimeout(() => {
        const selector = document.querySelector(".goog-te-combo")
        if (!selector) {
          forceTranslation(hardRefresh)
          return
        }
        if (force || selector.value !== googleLanguage) forceTranslation(hardRefresh)
      }, force ? 180 : 420)
    }

    observer = new MutationObserver((mutations) => {
      if (isApplying) return
      protectBrandAndIcons()
      restoreBrandName()
      const relevantChange = mutations.some((mutation) => {
        const target = mutation.target?.nodeType === 1
          ? mutation.target
          : mutation.target?.parentElement
        return !target?.closest?.("#google_translate_element, .goog-te-menu-frame, .goog-te-banner-frame")
      })
      if (relevantChange) scheduleTranslation(true)
    })
    observeDocument()
    protectBrandAndIcons()
    restoreBrandName()

    const initializeGoogleTranslate = () => {
      const mount = document.getElementById(mountId)
      if (!mount || !window.google?.translate?.TranslateElement) return
      if (!mount.dataset.initialized) {
        new window.google.translate.TranslateElement({
          pageLanguage: "pt",
          includedLanguages: "en,es",
          autoDisplay: false,
          multilanguagePage: true,
        }, mountId)
        mount.dataset.initialized = "true"
      }
      scheduleTranslation(true, true)
    }

    window.googleTranslateElementInit = initializeGoogleTranslate
    window.__zenithForceTranslation = (hardRefresh = false) => scheduleTranslation(true, hardRefresh)
    const handleTranslatedNavigation = () => setTranslationPending(true)
    window.addEventListener("zenith:navigate", handleTranslatedNavigation)
    const existingScript = document.getElementById("google-translate-script")
    if (existingScript) {
      window.setTimeout(initializeGoogleTranslate, 0)
    } else {
      const script = document.createElement("script")
      script.id = "google-translate-script"
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
      script.async = true
      document.body.appendChild(script)
    }
    return () => {
      window.clearTimeout(applyTimer)
      window.clearTimeout(retryTimer)
      window.clearTimeout(resumeTimer)
      window.clearTimeout(brandTimer)
      window.clearTimeout(languageSwitchTimer)
      observer?.disconnect()
      window.removeEventListener("zenith:navigate", handleTranslatedNavigation)
      delete window.__zenithForceTranslation
      delete window.googleTranslateElementInit
    }
  }, [appLanguage])

  useEffect(() => {
    if (!translationPending) return undefined
    const safetyTimer = window.setTimeout(() => setTranslationPending(false), 6500)
    return () => window.clearTimeout(safetyTimer)
  }, [translationPending, appLanguage])

  useEffect(() => {
    if (getAppLanguage() === DEFAULT_APP_LANGUAGE) return undefined
    setTranslationPending(true)
    const timer = window.setTimeout(() => window.__zenithForceTranslation?.(true), 260)
    return () => window.clearTimeout(timer)
  }, [location.key])

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
    const routeTimeout = window.setTimeout(
      () => setQuickLoading(false),
      appLanguage === DEFAULT_APP_LANGUAGE ? 900 : 2300,
    )
    return () => window.clearTimeout(routeTimeout)
  }, [location.key, appLanguage])



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
            <div id="google_translate_element" className="google-translate-shell" aria-hidden="true" />

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
            {(quickLoading || translationPending) && (
              <div className="route-quick-loader notranslate" translate="no" role="status" aria-label={translationPending ? systemCopy.applyingLanguage : systemCopy.openingPage}>
                <div>
                  <span className="material-symbols-outlined notranslate" translate="no" aria-hidden="true">eco</span>
                  <i aria-hidden="true" />
                </div>
                <strong className="notranslate" translate="no">Zenith</strong>
                <span>{translationPending ? systemCopy.applyingLanguage : systemCopy.preparingPage}</span>
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
