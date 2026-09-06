import "../../../styles/App/FeatureAccessPanel.css"

const FEATURE_NAMES = {
  diagnosis: "Análise da soja por IA",
  monitoring: "Monitoramento da plantação"
}

const PERMANENT_BLOCKS = {
  "3d": {
    icon: "deployed_code",
    eyebrow: "TECNOLOGIA EM DESENVOLVIMENTO",
    title: "Reconstrução 3D ainda não disponível",
    description: "Este recurso faz parte do projeto acadêmico Zenith e ainda está em desenvolvimento. Por enquanto, o acesso pelo aplicativo permanece restrito.",
    badge: "Acesso não liberado"
  },
  team: {
    icon: "groups",
    eyebrow: "RECURSO RESTRITO DO PROJETO ACADÊMICO",
    title: "Gestão de equipe não disponível",
    description: "A criação e a administração de equipes estão restritas nesta versão acadêmica do Zenith. Este acesso permanece liberado somente para as contas responsáveis pelo projeto.",
    badge: "Acesso restrito"
  }
}

export default function FeatureAccessPanel({ feature, access, blocked3D = false, blockedFeature }) {
  const permanentBlock = PERMANENT_BLOCKS[blockedFeature || (blocked3D ? "3d" : "")]
  if (permanentBlock) {
    return (
      <section className="feature-access feature-access--blocked feature-access--permanent" aria-labelledby={`feature-access-${blockedFeature || "3d"}-title`}>
        <div className="feature-access__glow" aria-hidden="true" />
        <div className="feature-access__icon"><span className="material-symbols-outlined">{permanentBlock.icon}</span></div>
        <div className="feature-access__copy">
          <span className="feature-access__eyebrow">{permanentBlock.eyebrow}</span>
          <h2 id={`feature-access-${blockedFeature || "3d"}-title`}>{permanentBlock.title}</h2>
          <p>{permanentBlock.description}</p>
          <div className="feature-access__meta"><span><i /> Projeto acadêmico</span><span><i /> Ambiente controlado</span></div>
        </div>
        <span className="feature-access__badge"><span className="material-symbols-outlined">lock</span> {permanentBlock.badge}</span>
      </section>
    )
  }

  if (!access || access.fullAccess) return null

  if (access.loading) {
    return <div className="feature-access feature-access--status" role="status"><span className="feature-access__spinner" /> Verificando acesso...</div>
  }

  if (access.error) {
    return (
      <section className="feature-access feature-access--blocked" role="alert">
        <div className="feature-access__icon"><span className="material-symbols-outlined">wifi_off</span></div>
        <div className="feature-access__copy"><h2>Acesso temporariamente indisponível</h2><p>{access.error}</p></div>
        <button type="button" className="feature-access__button" onClick={access.refresh}>Tentar novamente</button>
      </section>
    )
  }

  if (access.remaining > 0) {
    return (
      <aside className="feature-access feature-access--quota" aria-label="Limite de uso do projeto acadêmico">
        <span className="material-symbols-outlined">school</span>
        <div><strong>Acesso acadêmico</strong><p>{access.remaining} de 3 {access.remaining === 1 ? "utilização disponível" : "utilizações disponíveis"} em {FEATURE_NAMES[feature]}.</p></div>
        <div className="feature-access__dots" aria-hidden="true">{[0, 1, 2].map((index) => <i key={index} className={index < access.remaining ? "is-active" : ""} />)}</div>
      </aside>
    )
  }

  return (
    <section className="feature-access feature-access--blocked" aria-labelledby={`feature-access-${feature}-title`}>
      <div className="feature-access__glow" aria-hidden="true" />
      <div className="feature-access__icon"><span className="material-symbols-outlined">lock_clock</span></div>
      <div className="feature-access__copy">
        <span className="feature-access__eyebrow">PROJETO ACADÊMICO EM DESENVOLVIMENTO</span>
        <h2 id={`feature-access-${feature}-title`}>Limite de uso alcançado</h2>
        <p>Por ser um projeto acadêmico em desenvolvimento, o acesso a {FEATURE_NAMES[feature]} está limitado a três utilizações por conta. Você já utilizou as três análises disponíveis.</p>
      </div>
      <span className="feature-access__badge"><span className="material-symbols-outlined">verified_user</span> 3 de 3 utilizadas</span>
    </section>
  )
}
