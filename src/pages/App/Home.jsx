import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore"
import { auth, db } from "../../services/firebase"
import { getWeatherByCity } from "../../services/weatherService"

import ParticleBackground from "../../components/App/Home/ParticleBackground"
import MouseGlow from "../../components/App/Home/MouseGlow"
import SplashScreen from "../../components/App/Global/SplashScreen"
import WelcomeSection from "../../components/App/Home/WelcomeSection"
import FarmInfoCard from "../../components/App/Home/FarmInfoCard"
import MetricsGrid from "../../components/App/Home/MetricsGrid"
import ActivitiesList from "../../components/App/Home/ActivitiesList"
import AppFooter from "../../components/App/Global/AppFooter"
import MenuBar from "../../components/App/Global/MenuBar"
import AppHeader from "../../components/App/Global/AppHeader"
import ProfileSidebar from "../../components/App/Home/ProfileSidebar"

import "../../styles/App/Home.css"

export default function Home() {
  const [userData, setUserData] = useState(null)
  const [farmData, setFarmData] = useState(null)
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const userRef = doc(db, "users", user.uid)
        const userSnap = await getDoc(userRef)

        if (userSnap.exists()) {
          setUserData({ ...userSnap.data(), uid: user.uid })
        }

        const farmsQuery = query(
          collection(db, "farms"),
          where("ownerId", "==", user.uid)
        )

        const farmsSnap = await getDocs(farmsQuery)

        if (farmsSnap.empty) {
          setFarmData(null)
          setWeather(null)
          return
        }

        const farmDoc = farmsSnap.docs[0]
        const farm = { ...farmDoc.data(), id: farmDoc.id }
        setFarmData(farm)

        if (farm.municipio && farm.uf) {
          const weatherData = await getWeatherByCity(farm.municipio, farm.uf)
          setWeather(weatherData)
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const hasFarm = Boolean(farmData)
  const userName = userData?.name?.split(" ")[0]

  if (loading) {
    return <SplashScreen message="Carregando início..." />
  }

  return (
    <div className="home-page">
      <div className="home-site-atmosphere" aria-hidden="true">
        <div className="home-bg-image" />
        <div className="home-grid-overlay" />
        <div className="home-circuit-layer">
          <span className="home-circuit-dot dot-1" />
          <span className="home-circuit-dot dot-2" />
          <span className="home-circuit-dot dot-3" />
          <span className="home-data-line line-1" />
          <span className="home-data-line line-2" />
          <span className="home-data-line line-3" />
          <span className="home-float-icon fi-1 material-symbols-outlined">eco</span>
          <span className="home-float-icon fi-2 material-symbols-outlined">monitoring</span>
          <span className="home-float-icon fi-3 material-symbols-outlined">agriculture</span>
          <span className="home-float-icon fi-4 material-symbols-outlined">satellite_alt</span>
        </div>
        <div className="home-grain-overlay" />
      </div>

      <ParticleBackground />
      <MouseGlow />
      <div className="grain-overlay" aria-hidden="true" />


      <AppHeader title="Zenith" showLogo={true} showNotification={true} />

      <div className="home-desktop-grid home-no-modules">
        <div className="main-content-column">
          <div className="home-container">
            <div className="top-row-desktop">
              <WelcomeSection
                userName={userName}
                hasFarm={hasFarm}
                farmName={farmData?.name}
                onRegister={() => navigate("/cadastrar-fazenda")}
                onExplore={() => navigate("/explore")}
                onProfile={() => navigate("/profile")}
              />

              {hasFarm && <FarmInfoCard farmData={farmData} />}
            </div>

            <MetricsGrid hasFarm={hasFarm} weather={weather} farmData={farmData} />

            <section className="activities-section">
              <div className="section-header">
                <h2 className="section-title">
                  <span className="material-symbols-outlined">history</span>
                  Atividades Recentes
                </h2>
              </div>

              <ActivitiesList
                hasFarm={hasFarm}
                onViewAll={() =>
                  navigate("/explore", { state: { activeTab: "atividades" } })
                }
                onRegister={() => navigate("/cadastrar-fazenda")}
              />
            </section>
          </div>
        </div>

        <ProfileSidebar userData={userData} farmData={farmData} />
      </div>

      <AppFooter />
      <MenuBar />
    </div>
  )
}
