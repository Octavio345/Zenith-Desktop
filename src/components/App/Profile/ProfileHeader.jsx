const materialProfileIcons = new Set([
  "agriculture",
  "eco",
  "grass",
  "person",
  "account_circle",
  "engineering",
  "forest",
  "yard",
  "psychiatry",
  "location_on"
])

export default function ProfileHeader({
  profileIcon,
  userName,
  memberTime,
  editing,
  onAvatarClick
}) {
  const iconName = materialProfileIcons.has(profileIcon) ? profileIcon : "agriculture"

  return (
    <div className="profile-header-section">
      <div className="profile-header-content">
        <button
          type="button"
          className={`profile-avatar-container ${editing ? "editing" : ""}`}
          onClick={onAvatarClick}
          aria-label="Alterar ícone do perfil"
        >
          <div className="profile-avatar">
            <span className="material-symbols-outlined">{iconName}</span>
          </div>
          {editing && (
            <div className="profile-avatar-edit-badge">
              <span className="material-symbols-outlined">edit</span>
            </div>
          )}
        </button>

        <div className="profile-title-wrapper">
          <span className="profile-kicker">Perfil do produtor</span>
          <h1 className="profile-title">{userName || "Agricultor"}</h1>
          <div className="profile-badge-tech">
            <span className="material-symbols-outlined">verified</span>
            <span className="membro">Membro há {memberTime}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
