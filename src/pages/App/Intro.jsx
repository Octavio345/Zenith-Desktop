import { useNavigate } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import "../../styles/App/Intro.css"

import Logo from "/public/assets/image/Logo.png"

export default function Intro() {
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (window.innerWidth <= 768) return

      setMousePosition({
        x: (event.clientX / window.innerWidth - 0.5) * 16,
        y: (event.clientY / window.innerHeight - 0.5) * 16
      })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return (
    <div
      className="intro-container intro-classic-refresh"
      ref={containerRef}
      style={{
        "--mouse-x": `${mousePosition.x}px`,
        "--mouse-y": `${mousePosition.y}px`
      }}
    >
      <div className="background-layer background-layer-1"></div>
      <div className="background-layer background-layer-2"></div>
      <div className="background-overlay"></div>
      <div className="grid-pattern"></div>

      <section className="intro-card">
        <div className="card-glow"></div>
        <div className="card-pattern"></div>

        <div className="logo-section">
          <div className="logo-wrapper">
            <div className="logo-container">
              <img src={Logo} alt="AgroVoo" className="logo-image" />
              <div className="logo-ring"></div>
            </div>

            <div className="logo-badge">
              <span className="badge-text">TECNOLOGIA AGRO 4.0</span>
            </div>

            <h1 className="logo-title">
              <span className="title-line">Monitoramento</span>
              <span className="title-line title-line-highlight">Inteligente</span>
            </h1>

            <p className="logo-description">
              Drones autonomos para detectar pragas, acompanhar saude da lavoura e transformar dados de campo em decisoes rapidas.
            </p>

            <div className="actions-section">
              <button className="btn btn-primary" onClick={() => navigate("/login")}>
                <span className="btn-text">Acessar Plataforma</span>
                <span className="btn-icon">→</span>
                <div className="btn-shine"></div>
              </button>

              <button className="btn btn-secondary" onClick={() => navigate("/register")}>
                <span className="btn-text">Comecar Agora</span>
                <span className="btn-icon">+</span>
                <div className="btn-shine"></div>
              </button>
            </div>
          </div>
        </div>

        <div className="stats-section">
          <div className="stat-item">
            <span className="stat-number">98%</span>
            <span className="stat-label">Precisao na deteccao</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">24/7</span>
            <span className="stat-label">Monitoramento continuo</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">-40%</span>
            <span className="stat-label">Perdas evitadas</span>
          </div>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-content">
              <h3 className="feature-title">Analise do Solo</h3>
              <p className="feature-description">Umidade, nutrientes e saude do solo em tempo real.</p>
            </div>
            <div className="feature-hover-bg"></div>
          </div>

          <div className="feature-card">
            <div className="feature-content">
              <h3 className="feature-title">Deteccao de Pragas</h3>
              <p className="feature-description">IA identifica sinais de risco antes do dano se espalhar.</p>
            </div>
            <div className="feature-hover-bg"></div>
          </div>

          <div className="feature-card">
            <div className="feature-content">
              <h3 className="feature-title">Voo Autonomo</h3>
              <p className="feature-description">Rotas inteligentes para mapear talhoes com consistencia.</p>
            </div>
            <div className="feature-hover-bg"></div>
          </div>

          <div className="feature-card">
            <div className="feature-content">
              <h3 className="feature-title">Relatorios</h3>
              <p className="feature-description">Indicadores simples para orientar o proximo manejo.</p>
            </div>
            <div className="feature-hover-bg"></div>
          </div>
        </div>

        <div className="trust-section">
          <div className="trust-badge">
            <span className="trust-text">Dados seguros</span>
          </div>
          <div className="trust-badge">
            <span className="trust-text">Alertas inteligentes</span>
          </div>
          <div className="trust-badge">
            <span className="trust-text">Suporte 24/7</span>
          </div>
        </div>

        <div className="footer">
          <p className="footer-text">
            Ja e produtor rural?
            <a href="/login" className="footer-link">
              Entrar na plataforma
              <span className="link-arrow">→</span>
            </a>
          </p>
        </div>
      </section>
    </div>
  )
}
