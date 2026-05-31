export default function WelcomeSection({
  userName,
  hasFarm,
  farmName,
  onRegister,
  onExplore,
  onProfile
}) {
  return (
    <section className="welcome-section home-command-center">
      <div className="welcome-content">
        <div className="welcome-badge">
          <span className="material-symbols-outlined">monitoring</span>
          <span>Painel operacional</span>
        </div>

        <h1 className="welcome-title">
          Olá, <span className="gradient-text">{userName || "Agricultor"}</span>
        </h1>

        <p className="welcome-subtitle">
          {hasFarm
            ? `Resumo da operação de ${farmName || "sua fazenda"} com clima, diagnósticos e tarefas em um só lugar.`
            : "Cadastre uma fazenda para liberar monitoramento, mapa, clima e organização da rotina."}
        </p>

        <div className="welcome-actions">
          {hasFarm ? (
            <>
              <button className="welcome-primary-action" onClick={onExplore}>
                <span className="material-symbols-outlined">apps</span>
                Abrir serviços
              </button>
              <button className="welcome-secondary-action" onClick={onProfile}>
                <span className="material-symbols-outlined">manage_accounts</span>
                Ver perfil
              </button>
            </>
          ) : (
            <button className="register-farm-btn" onClick={onRegister}>
              <span className="material-symbols-outlined">add</span>
              <span>Cadastrar Fazenda</span>
              <div className="btn-glow"></div>
            </button>
          )}
        </div>
      </div>

      <div className="welcome-status-panel" aria-label="Resumo do sistema">
        <div className="welcome-status-item">
          <span className="material-symbols-outlined">verified</span>
          <div>
            <strong>{hasFarm ? "Fazenda ativa" : "Cadastro pendente"}</strong>
            <small>Status</small>
          </div>
        </div>

        <div className="welcome-status-item">
          <span className="material-symbols-outlined">satellite_alt</span>
          <div>
            <strong>Mapa pronto</strong>
            <small>Demarcação</small>
          </div>
        </div>

        <div className="welcome-status-item">
          <span className="material-symbols-outlined">sync</span>
          <div>
            <strong>Dados sincronizados</strong>
            <small>Atualização</small>
          </div>
        </div>
      </div>
    </section>
  )
}
