// components/Home/AppFooter.jsx
export default function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="footer-glow"></div>
      <div className="footer-content">
        <div className="footer-section">
          <div className="footer-logo">
            <span className="material-symbols-outlined">agriculture</span>
            <span>Zenith</span>
          </div>
          <p className="footer-description">
            Tecnologia de ponta para agricultura de precisão, monitoramento em tempo real e análise de dados.
          </p>
          <div className="social-links">
            {['nest_eco', 'linkedin', 'facebook', 'instagram'].map((icon) => (
              <a key={icon} href="#" className="social-link">
                <span className="material-symbols-outlined">{icon}</span>
              </a>
            ))}
          </div>
        </div>
        
        <div className="footer-section">
          <h5>Plataforma</h5>
          <ul>
            {['Dashboard', 'Fazendas', 'Voos', 'Relatórios', 'API'].map((item) => (
              <li key={item}><a href={`/${item.toLowerCase()}`}>{item}</a></li>
            ))}
          </ul>
        </div>
        
        <div className="footer-section">
          <h5>Suporte</h5>
          <ul>
            {['Ajuda', 'Documentação', 'Tutoriais', 'Contato', 'Status'].map((item) => (
              <li key={item}><a href={`/${item.toLowerCase()}`}>{item}</a></li>
            ))}
          </ul>
        </div>
        
        <div className="footer-section">
          <h5>Legal</h5>
          <ul>
            {['Termos', 'Privacidade', 'Segurança', 'Licenças'].map((item) => (
              <li key={item}><a href={`/${item.toLowerCase()}`}>{item}</a></li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="footer-bottom">
        <div className="footer-stats">
          <span>🌱 2,500+ fazendas monitoradas</span>
          <span>🚁 15,000+ voos realizados</span>
          <span>📊 1M+ análises processadas</span>
        </div>
        <div className="footer-copyright">
          <p>© 2026 Zenith. Todos os direitos reservados.</p>
          <p>Versão 2.0.1 • Desenvolvido com precision agriculture</p>
        </div>
      </div>
    </footer>
  )
}