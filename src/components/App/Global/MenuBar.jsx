import { useNavigate, useLocation } from "react-router-dom"
import "../../../styles/Global/MenuBar.css"

export default function MenuBar() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  const goTo = (path) => {
    if (!isActive(path)) {
      window.dispatchEvent(new Event("zenith:navigate"))
    }
    navigate(path)
  }

  return (
    <nav className="menu-bar">

      <div
        className={`menu-item ${isActive("/home") ? "active" : ""}`}
        onClick={() => goTo("/home")}
      >
        <span className="material-symbols-outlined">home</span>
      </div>

      <div
        className={`menu-item ${isActive("/explore") ? "active" : ""}`}
        onClick={() => goTo("/explore")}
      >
        <span className="material-symbols-outlined">explore</span>
      </div>

      <div
        className={`menu-item ${isActive("/profile") ? "active" : ""}`}
        onClick={() => goTo("/profile")}
      >
        <span className="material-symbols-outlined">person</span>
      </div>

    </nav>
  )
}
