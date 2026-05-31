// App.jsx do PWA
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"
import { useState, useEffect, useRef } from "react"
import { AnimatePresence } from "framer-motion"

import Intro from "./pages/App/Intro"
import Login from "./pages/App/Login"
import CadastroCompleto from "./pages/App/CadastroCompleto"
import CadastrarFazenda from "./pages/App/CadastroFazenda"
import Home from "./pages/App/Home"
import Profile from "./pages/App/Profile"
import ForgotPassword from "./pages/App/ForgotPassword"
import Explore from "./pages/App/Explore"

// Componentes
import SplashScreen from "./components/App/Global/SplashScreen"
import InstallPrompt from "./components/App/Global/InstallPrompt"
import InstallSuccess from "./components/App/Global/InstallSuccess"

// Estilos
import "./App.css"

function AppShell() {
  const location = useLocation()
  const firstRoute = useRef(true)
  const [loading, setLoading] = useState(false)
  const [routeLoading, setRouteLoading] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [showInstallSuccess, setShowInstallSuccess] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)

  useEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false
      return
    }

    setRouteLoading(true)
    const timeout = setTimeout(() => setRouteLoading(false), 650)
    return () => clearTimeout(timeout)
  }, [location.pathname])

  useEffect(() => {
    const startNavigationLoading = () => {
      setRouteLoading(true)
    }

    window.addEventListener("zenith:navigate", startNavigationLoading)
    return () => window.removeEventListener("zenith:navigate", startNavigationLoading)
  }, [])

  useEffect(() => {
    const handleDocumentClick = (event) => {
      const link = event.target.closest?.("a[href]")
      if (!link) return

      const url = new URL(link.href)
      const appRoutes = ["/home", "/explore", "/profile"]
      if (url.origin === window.location.origin && appRoutes.includes(url.pathname) && url.pathname !== location.pathname) {
        setRouteLoading(true)
      }
    }

    document.addEventListener("click", handleDocumentClick, true)
    return () => document.removeEventListener("click", handleDocumentClick, true)
  }, [location.pathname])

  
  
  useEffect(() => {
    // Detectar dispositivo
    const userAgent = navigator.userAgent
    setIsIOS(/iPhone|iPad|iPod/i.test(userAgent))
    setIsAndroid(/Android/i.test(userAgent))

    // Verificar se já está instalado (modo standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         window.navigator.standalone === true
    
    if (isStandalone) {
      setIsInstalled(true)
      console.log('✅ App rodando em modo standalone')
      return
    }

    // Verificar parâmetros da URL
    const params = new URLSearchParams(window.location.search)
    const shouldInstall = params.get('install') === 'true'
    const source = params.get('source')
    
    console.log('📱 Modo:', isStandalone ? 'standalone' : 'navegador')
    console.log('🔧 Parâmetros:', { shouldInstall, source })

    // Se veio para instalar, mostrar prompt após 1 segundo
    if (shouldInstall && !isStandalone) {
      setTimeout(() => {
        setShowInstallPrompt(true)
      }, 1000)
    }

    // Capturar evento de instalação
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      console.log('📲 Evento beforeinstallprompt capturado')
      setDeferredPrompt(e)
      
      // Se veio com install=true, disparar automaticamente
      if (shouldInstall) {
        setTimeout(() => {
          handleInstall()
        }, 1500)
      }
    }

    

    // Quando o app for instalado
    const handleAppInstalled = (e) => {
      console.log('🎉 App instalado com sucesso!', e)
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setShowInstallSuccess(true)
      setDeferredPrompt(null)
      
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])


const handleInstall = async () => {
  if (!deferredPrompt) {
    console.log('❌ Prompt não disponível')
    return
  }

  deferredPrompt.prompt()

  const choiceResult = await deferredPrompt.userChoice

  if (choiceResult.outcome === 'accepted') {
    console.log('✅ Usuário aceitou instalar')
  } else {
    console.log('❌ Usuário recusou')
  }

  setDeferredPrompt(null)
}

  return (
      <AnimatePresence mode="wait">
        {loading || routeLoading ? (
          <SplashScreen
            key="splash"
            message={routeLoading ? "Abrindo tela..." : "Preparando sua area..."}
            onComplete={() => {
              setLoading(false)
              setRouteLoading(false)
            }}
          />
        ) : (
          <>
            {/* Prompt de instalação */}
            {showInstallPrompt && !isInstalled && (
              <InstallPrompt 
                onInstall={handleInstall}
                onClose={() => setShowInstallPrompt(false)}
                isIOS={isIOS}
                isAndroid={isAndroid}
                hasPrompt={!!deferredPrompt}
              />
            )}

            {/* Mensagem de sucesso após instalação */}
            {showInstallSuccess && (
              <InstallSuccess 
                onClose={() => setShowInstallSuccess(false)}
                isIOS={isIOS}
                isAndroid={isAndroid}
              />
            )}
            
            <Routes key="app">
              <Route path="/" element={<Intro />} />
              <Route path="/login" element={<Login setAppLoading={setLoading} />} />
              <Route path="/register" element={<CadastroCompleto />} />
              <Route path="/cadastrar-fazenda" element={<CadastrarFazenda />} />
              <Route path="/home" element={<Home />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/explore" element={<Explore />} />
            </Routes>
          </>
        )}
      </AnimatePresence>
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
