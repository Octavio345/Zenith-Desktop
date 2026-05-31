export default function ProfileActions({
  editing,
  saving,
  onEdit,
  onSave,
  onCancel,
  onLogout
}) {
  if (!editing) {
    return (
      <div className="profile-actions-tech">
        <button className="action-btn primary" onClick={onEdit}>
          <span className="material-symbols-outlined">edit</span>
          <span>Editar perfil</span>
        </button>

        <button className="action-btn danger" onClick={onLogout}>
          <span className="material-symbols-outlined">logout</span>
          <span>Sair</span>
        </button>
      </div>
    )
  }

  return (
    <div className="profile-actions-tech">
      <button className="action-btn primary" onClick={onSave} disabled={saving}>
        {saving ? (
          <>
            <div className="btn-spinner"></div>
            <span>Salvando...</span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined">save</span>
            <span>Salvar alterações</span>
          </>
        )}
      </button>

      <button className="action-btn secondary" onClick={onCancel}>
        <span className="material-symbols-outlined">close</span>
        <span>Cancelar</span>
      </button>
    </div>
  )
}
