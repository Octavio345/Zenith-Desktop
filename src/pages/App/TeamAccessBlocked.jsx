import AppFooter from "../../components/App/Global/AppFooter"
import AppHeader from "../../components/App/Global/AppHeader"
import MenuBar from "../../components/App/Global/MenuBar"
import FeatureAccessPanel from "../../components/App/Explore/FeatureAccessPanel"

export default function TeamAccessBlocked() {
  return (
    <>
      <AppHeader />
      <main className="feature-access-page" data-system-bar-color="#f5f8f1">
        <section className="feature-access-page__intro">
          <span><span className="material-symbols-outlined">shield_lock</span> Controle de acesso Zenith</span>
          <h1>Gestão de equipe</h1>
          <p>Organização de funcionários, funções e atividades da propriedade.</p>
        </section>
        <FeatureAccessPanel blockedFeature="team" />
      </main>
      <AppFooter />
      <MenuBar />
    </>
  )
}
