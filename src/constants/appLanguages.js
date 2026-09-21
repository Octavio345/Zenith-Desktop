export const DEFAULT_APP_LANGUAGE = "pt-BR"

export const APP_LANGUAGES = [
  { code: "pt-BR", googleCode: "pt", label: "Português", flag: "🇧🇷" },
  { code: "en-US", googleCode: "en", label: "English", flag: "🇺🇸" },
  { code: "es-ES", googleCode: "es", label: "Español", flag: "🇪🇸" },
]

const APP_SYSTEM_COPY = {
  "pt-BR": {
    verifyingAccess: "Verificando acesso",
    preparingWorkspace: "Preparando sua área de trabalho",
    openingPage: "Abrindo página",
    preparingPage: "Preparando página",
    applyingLanguage: "Aplicando idioma",
    loading: "Carregando",
    loadingProfile: "Carregando perfil...",
    loadingActivities: "Carregando atividades...",
    loadingTeam: "Carregando equipe",
    loading3D: "Carregando visualização 3D...",
    fetchingWeather: "Obtendo dados meteorológicos...",
    weatherLoadingTitle: "Buscando clima",
    fetchingDataFor: "Obtendo dados para",
    fetchingOperationalData: "Buscando os dados operacionais...",
  },
  "en-US": {
    verifyingAccess: "Verifying access",
    preparingWorkspace: "Preparing your workspace",
    openingPage: "Opening page",
    preparingPage: "Preparing page",
    applyingLanguage: "Applying language",
    loading: "Loading",
    loadingProfile: "Loading profile...",
    loadingActivities: "Loading activities...",
    loadingTeam: "Loading team",
    loading3D: "Loading 3D view...",
    fetchingWeather: "Fetching weather data...",
    weatherLoadingTitle: "Fetching weather",
    fetchingDataFor: "Fetching data for",
    fetchingOperationalData: "Fetching operational data...",
  },
  "es-ES": {
    verifyingAccess: "Verificando el acceso",
    preparingWorkspace: "Preparando tu espacio de trabajo",
    openingPage: "Abriendo página",
    preparingPage: "Preparando página",
    applyingLanguage: "Aplicando idioma",
    loading: "Cargando",
    loadingProfile: "Cargando perfil...",
    loadingActivities: "Cargando actividades...",
    loadingTeam: "Cargando equipo",
    loading3D: "Cargando visualización 3D...",
    fetchingWeather: "Obteniendo datos meteorológicos...",
    weatherLoadingTitle: "Consultando el clima",
    fetchingDataFor: "Obteniendo datos para",
    fetchingOperationalData: "Obteniendo los datos operativos...",
  },
}

const LANGUAGE_STORAGE_KEY = "zenithLanguage"

export const hasStoredAppLanguage = () => {
  if (typeof window === "undefined") return false
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return APP_LANGUAGES.some((language) => language.code === stored)
}

export const getAppLanguage = () => {
  if (typeof window === "undefined") return DEFAULT_APP_LANGUAGE
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return APP_LANGUAGES.some((language) => language.code === stored) ? stored : DEFAULT_APP_LANGUAGE
}

export const getAppSystemCopy = (language = getAppLanguage()) => (
  APP_SYSTEM_COPY[language] || APP_SYSTEM_COPY[DEFAULT_APP_LANGUAGE]
)

const setGoogleTranslationCookie = (language) => {
  if (typeof document === "undefined") return
  const expires = "expires=Thu, 01 Jan 1970 00:00:00 GMT"
  const hostname = window.location.hostname
  if (language === DEFAULT_APP_LANGUAGE) {
    document.cookie = `googtrans=;${expires};path=/`
    if (hostname && hostname !== "localhost") {
      document.cookie = `googtrans=;${expires};path=/;domain=${hostname}`
      document.cookie = `googtrans=;${expires};path=/;domain=.${hostname}`
    }
    return
  }
  const selected = APP_LANGUAGES.find((item) => item.code === language) || APP_LANGUAGES[0]
  document.cookie = `googtrans=/pt/${selected.googleCode};path=/`
  if (hostname && hostname !== "localhost") {
    document.cookie = `googtrans=/pt/${selected.googleCode};path=/;domain=${hostname}`
  }
}

export const persistAppLanguage = (language) => {
  const selected = APP_LANGUAGES.some((item) => item.code === language) ? language : DEFAULT_APP_LANGUAGE
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, selected)
    document.documentElement.lang = selected
  }
  setGoogleTranslationCookie(selected)
  return selected
}

export const activateAppLanguage = (language) => {
  const selected = persistAppLanguage(language)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("zenith:language-change", {
      detail: { language: selected },
    }))
    // Retornar ao idioma original precisa restaurar o DOM que o Google
    // Translate alterou. Para inglês e espanhol a troca ocorre na mesma tela.
    if (selected === DEFAULT_APP_LANGUAGE) window.location.reload()
  }
  return selected
}
