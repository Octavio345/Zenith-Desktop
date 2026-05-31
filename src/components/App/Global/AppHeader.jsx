import { useState } from "react"
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import "../../../styles/Global/AppHeader.css"

const navItems = [
  { label: "Início", href: "/home" },
  { label: "Serviços", href: "/explore" },
  { label: "Perfil", href: "/profile" }
]

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const isActivePath = (href) => {
    if (href === "/home") return location.pathname === "/home"
    return location.pathname.startsWith(href)
  }

  const handleNavigation = (event, href) => {
    if (location.pathname === href) return
    event.preventDefault()
    window.dispatchEvent(new Event("zenith:navigate"))
    setTimeout(() => navigate(href), 300)
  }

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="header"
      >
        <div className="container">
          <Link
            to="/home"
            className="logo"
            aria-label="Ir para o início"
            onClick={(event) => handleNavigation(event, "/home")}
          >
            <span className="logo-text">
              ZENI<span className="accent">TH</span>
            </span>
            <div className="logo-glow" />
          </Link>

          <nav className="nav" aria-label="Navegação principal">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={(event) => handleNavigation(event, item.href)}
                className={({ isActive }) => `nav-item ${isActive || isActivePath(item.href) ? "active" : ""}`}
              >
                <span>{item.label}</span>
                {isActivePath(item.href) && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="nav-indicator"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
              </NavLink>
            ))}
          </nav>

          <div className="right">
            <button
              className={`menu-toggle ${menuOpen ? "active" : ""}`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Abrir menu"
              type="button"
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </motion.header>
      <div className="header-spacer" aria-hidden="true" />

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="mobile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="mobile-panel"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={(event) => {
                    handleNavigation(event, item.href)
                    setMenuOpen(false)
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
