// components/Profile/AlertMessage.jsx
export default function AlertMessage({ type, text }) {
  if (!text) return null

  const icons = {
    success: "check_circle",
    error: "error"
  }

  return (
    <div className={`profile-alert ${type}`}>
      <div className="alert-glow"></div>
      <span className="material-symbols-outlined alert-icon">{icons[type]}</span>
      <span className="alert-text">{text}</span>
      <div className="alert-progress"></div>
    </div>
  )
}