import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "../../../services/firebase"
import { getUserAccessProfile, isOperationalRole } from "../../../services/accessControl"
import etecAmericanaLogo from "../../../../logo_etec_americana.png"
import cpsSaoPauloLogo from "../../../../2026_regua_logo_cps_brasao_horizontal_regua_brasao+cps_cor.png"

const links = [
  { label: "Início", path: "/home", icon: "home" },
  { label: "Explore", path: "/explore", icon: "explore" },
  { label: "Equipe", path: "/equipe", icon: "groups" },
  { label: "Perfil", path: "/profile", icon: "person" },
]

const navigateLoading = () => window.dispatchEvent(new CustomEvent("zenith:navigate"))

const rawContacts = [
  {
    label: "Telefone",
    value: "(19) 97115-9598",
    href: "tel:+5519971159598",
    icon: "call",
  },
  {
    label: "E-mail",
    value: "zenith.agroia@gmail.com",
    href: "mailto:zenith.agroia@gmail.com",
    icon: "mail",
  },
  {
    label: "Instagram",
    value: "@zenith.agricola",
    href: "https://www.instagram.com/zenith.agricola/",
    icon: "photo_camera",
  },
]

export default function AppFooter() {
  const [canManageTeam, setCanManageTeam] = useState(false)

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) return setCanManageTeam(false)
    try {
      const profile = await getUserAccessProfile(user.uid)
      setCanManageTeam(!isOperationalRole(profile?.role))
    } catch {
      setCanManageTeam(false)
    }
  }), [])

  return (
    <footer className="zenith-footer">
      <div className="zenith-footer__surface">
        <div className="zenith-footer__main">
          <section className="zenith-footer__brand">
            <div className="zenith-footer__brand-line">
              <img src="/assets/image/Logo-redonda.webp" alt="" />
              <div><strong>Zenith</strong><span>Sua precisão agrícola no ponto mais alto</span></div>
            </div>
            <p>Informação clara para proteger a lavoura, organizar a operação e tomar decisões melhores no campo.</p>
            <div className="zenith-footer__capabilities">
              <span><span className="material-symbols-outlined">eco</span> Triagem IA</span>
              <span><span className="material-symbols-outlined">monitoring</span> Monitoramento</span>
              <span><span className="material-symbols-outlined">dashboard</span> Gestão</span>
            </div>
          </section>

          <section className="zenith-footer__navigation">
            <small>NAVEGAÇÃO</small>
            <nav aria-label="Navegação do rodapé">
              {links.filter((item) => item.path !== "/equipe" || canManageTeam).map((item) => (
                <Link to={item.path} key={item.path} onClick={navigateLoading}>
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span>{item.label}</span>
                  <span className="material-symbols-outlined">arrow_outward</span>
                </Link>
              ))}
            </nav>
          </section>

          <section className="zenith-footer__contact">
            <small>FALE COM A ZENITH</small>
            <div className="zenith-footer__contact-list">
              {rawContacts.map((item) => {
                const content = <><span className="material-symbols-outlined">{item.icon}</span><span><small>{item.label}</small><strong>{item.value}</strong></span></>
                return item.href
                  ? <a href={item.href} key={item.label} target={item.label === "Instagram" ? "_blank" : undefined} rel={item.label === "Instagram" ? "noreferrer" : undefined}>{content}</a>
                  : <div key={item.label}>{content}</div>
              })}
            </div>
          </section>
        </div>

        <div className="zenith-footer__institutional" aria-label="Origem acadêmica do projeto">
          <div className="zenith-footer__institutional-inner">
            <div className="zenith-footer__institutional-heading">
              <span className="material-symbols-outlined" aria-hidden="true">school</span>
              <span>
                <small>ORIGEM DO PROJETO</small>
                <strong>TCC desenvolvido por estudantes da Etec Polivalente de Americana</strong>
                <span>Da formação técnica à construção de uma agtech.</span>
              </span>
            </div>

            <div className="zenith-footer__institutional-logos" role="list">
              <div className="zenith-footer__institutional-logo zenith-footer__institutional-logo--etec" role="listitem">
                <img src={etecAmericanaLogo} alt="Etec Polivalente de Americana — São Paulo" />
              </div>
              <span className="zenith-footer__institutional-divider" aria-hidden="true" />
              <div className="zenith-footer__institutional-logo zenith-footer__institutional-logo--cps" role="listitem">
                <img src={cpsSaoPauloLogo} alt="Centro Paula Souza e Governo do Estado de São Paulo" />
              </div>
            </div>
          </div>
        </div>

        <div className="zenith-footer__bottom">
          <span>© 2026 Zenith. Todos os direitos reservados.</span>
          <span><span className="material-symbols-outlined">verified_user</span> Tecnologia aplicada ao campo com clareza e precisão.</span>
        </div>
      </div>
    </footer>
  )
}
