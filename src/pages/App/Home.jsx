import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"
import { collection, doc, getDoc, getDocs, onSnapshot, query, updateDoc, where } from "firebase/firestore"
import { auth, db } from "../../services/firebase"
import { getUserAccessProfile, isOperationalRole } from "../../services/accessControl"
import { getWeatherByCity } from "../../services/weatherService"
import { isConfirmedWorkItemExpired } from "../../services/workItemLifecycle"
import { removeFieldOccurrence } from "../../services/fieldOperations"
import { getAppLanguage } from "../../constants/appLanguages"
import AppHeader from "../../components/App/Global/AppHeader"
import MenuBar from "../../components/App/Global/MenuBar"
import AppFooter from "../../components/App/Global/AppFooter"
import FarmCommandCenter from "../../components/App/Home/FarmCommandCenter"
import "../../styles/App/Home.css"

export default function Home() {
  const navigate = useNavigate()
  const [userData, setUserData] = useState(null)
  const [farmData, setFarmData] = useState(null)
  const [weather, setWeather] = useState(null)
  const [activities, setActivities] = useState([])
  const [assignedTasks, setAssignedTasks] = useState([])
  const [employeeAction, setEmployeeAction] = useState("")
  const [employeeActionError, setEmployeeActionError] = useState("")
  const [selectedWorkItem, setSelectedWorkItem] = useState(null)
  const [lifecycleNow, setLifecycleNow] = useState(Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setLifecycleNow(Date.now()), 60000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) return
    try {
      const profile = await getUserAccessProfile(user.uid) || {}
      if (profile.id) setUserData({ ...profile, uid: user.uid })
      if (isOperationalRole(profile.role)) {
        const tasksSnap = await getDocs(query(collection(db, "activities"), where("assigneeId", "==", user.uid)))
        setAssignedTasks(tasksSnap.docs.map((taskDoc) => ({ id: taskDoc.id, ...taskDoc.data() })).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))))
      } else {
        setAssignedTasks([])
      }
      const farmOwnerId = profile.ownerId || profile.teamId || user.uid
      const farmsSnap = await getDocs(query(collection(db, "farms"), where("ownerId", "==", farmOwnerId)))
      const farm = farmsSnap.empty ? null : { ...farmsSnap.docs[0].data(), id: farmsSnap.docs[0].id }
      setFarmData(farm)
      const city = farm?.municipio || profile.city
      const state = farm?.uf || profile.state
      if (city && state) setWeather(await getWeatherByCity(city, state))
    } catch (error) {
      console.error("Erro ao carregar o painel:", error)
    }
  }), [])

  useEffect(() => {
    if (!auth.currentUser || !isOperationalRole(userData?.role)) return undefined
    const tasksQuery = query(collection(db, "activities"), where("assigneeId", "==", auth.currentUser.uid))
    return onSnapshot(tasksQuery, (snapshot) => {
      setAssignedTasks(snapshot.docs.map((taskDoc) => ({ id: taskDoc.id, ...taskDoc.data() })).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))))
    }, (error) => console.error("Erro ao sincronizar tarefas do funcionário:", error))
  }, [userData?.role])

  useEffect(() => {
    const user = auth.currentUser
    if (!user || !userData) return undefined

    const subscriptions = []
    const sortActivities = (items) => [...items].sort((a, b) => String(b.createdAt || b.date || "").localeCompare(String(a.createdAt || a.date || "")))

    if (!isOperationalRole(userData.role)) {
      const ownerActivities = query(collection(db, "activities"), where("ownerId", "==", user.uid))
      subscriptions.push(onSnapshot(ownerActivities, (snapshot) => {
        setActivities(sortActivities(snapshot.docs.map((activityDoc) => ({ id: activityDoc.id, ...activityDoc.data() }))))
      }, (error) => console.error("Erro ao sincronizar atividades da fazenda:", error)))
    } else {
      const ownerId = userData.ownerId || userData.teamId
      if (!ownerId) return undefined
      let generalActivities = []
      let assignedActivities = []
      const syncVisibleActivities = () => {
        const merged = new Map([...generalActivities, ...assignedActivities].map((activity) => [activity.id, activity]))
        setActivities(sortActivities([...merged.values()]))
      }
      subscriptions.push(onSnapshot(
        query(collection(db, "activities"), where("ownerId", "==", ownerId), where("scope", "==", "general")),
        (snapshot) => { generalActivities = snapshot.docs.map((activityDoc) => ({ id: activityDoc.id, ...activityDoc.data() })); syncVisibleActivities() },
        (error) => console.error("Erro ao sincronizar atividades gerais:", error),
      ))
      subscriptions.push(onSnapshot(
        query(collection(db, "activities"), where("assigneeId", "==", user.uid)),
        (snapshot) => { assignedActivities = snapshot.docs.map((activityDoc) => ({ id: activityDoc.id, ...activityDoc.data() })); syncVisibleActivities() },
        (error) => console.error("Erro ao sincronizar atividades atribuídas:", error),
      ))
    }

    return () => subscriptions.forEach((unsubscribe) => unsubscribe())
  }, [userData])

  const firstName = userData?.name?.split(" ")[0] || "Agricultor"
  const isEmployee = isOperationalRole(userData?.role)
  const hasFarm = Boolean(farmData)
  const appLanguage = getAppLanguage()
  const cropLabel = (() => {
    const crop = farmData?.plantacao || "Soja"
    if (String(crop).toLowerCase() !== "soja") return crop
    if (appLanguage === "en-US") return "Soybean"
    return "Soja"
  })()
  const temperature = hasFarm && weather?.temperature !== undefined ? Math.round(weather.temperature) : "--"
  const visibleActivities = useMemo(
    () => activities.filter((activity) => !isConfirmedWorkItemExpired(activity, lifecycleNow)),
    [activities, lifecycleNow],
  )
  const employeeWorkItems = useMemo(() => {
    if (!isEmployee || !userData?.uid) return []
    const taskItems = assignedTasks.map((task) => ({ ...task, workCollection: "activities", progressStatus: "em_andamento", due: task.date || "Sem prazo" }))
    return taskItems
      .filter((item) => !isConfirmedWorkItemExpired(item, lifecycleNow))
      .sort((a, b) => String(b.createdAt || b.date || "").localeCompare(String(a.createdAt || a.date || "")))
  }, [assignedTasks, isEmployee, lifecycleNow, userData?.uid, visibleActivities])
  const summary = useMemo(() => [
    { icon: "eco", label: "Analisar imagens", value: "Triagem de sinais nas folhas", tab: "diagnostico" },
    { icon: "monitoring", label: "Monitorar plantio", value: "Cobertura e uniformidade", tab: "monitoramento" },
    { icon: "map", label: "Mapa e talhões", value: "Áreas da sua propriedade", tab: "mapa" },
    { icon: "task_alt", label: "Atividades", value: `${visibleActivities.length} registradas`, tab: "atividades" },
  ], [hasFarm, visibleActivities.length, weather])

  const openExplore = (tab) => {
    localStorage.setItem("activeExploreTab", tab)
    navigate("/explore", { state: { activeTab: tab } })
  }

  const formatClock = (date) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date)

  const updateWorkShift = async (action) => {
    if (!auth.currentUser || !isEmployee) return
    const now = new Date()
    setEmployeeActionError("")
    setEmployeeAction(action)
    try {
      const payload = action === "start"
        ? { status: "trabalhando", entry: formatClock(now), exit: "--:--", workStartedAt: now.toISOString(), lastActivity: `Entrada registrada em ${formatClock(now)}` }
        : {
            status: "offline",
            exit: formatClock(now),
            workEndedAt: now.toISOString(),
            hours: Math.max(0, Math.round(((now.getTime() - new Date(userData?.workStartedAt || now).getTime()) / 3600000) * 100) / 100),
            lastActivity: `Saída registrada em ${formatClock(now)}`,
          }
      await updateDoc(doc(db, userData?.profileCollection || "employees", auth.currentUser.uid), payload)
      setUserData((current) => ({ ...current, ...payload }))
    } catch (error) {
      console.error("Erro ao registrar jornada:", error)
      setEmployeeActionError("Não foi possível registrar a jornada. Verifique a permissão do Firestore.")
    } finally { setEmployeeAction("") }
  }

  const updateAssignedTask = async (task, status) => {
    const now = new Date().toISOString()
    const workCollection = "activities"
    setEmployeeActionError("")
    setEmployeeAction(`${workCollection}:${task.id}`)
    try {
      const payload = status === "andamento"
        ? { status, startedAt: now, updatedAt: now }
        : status === "em_andamento"
          ? { status, startedAt: now, updatedAt: now }
        : { status, completedAt: now, updatedAt: now }
      await updateDoc(doc(db, workCollection, task.id), payload)
      if (workCollection === "activities" && status === "concluida") {
        removeFieldOccurrence(task.occurrenceId)
      }
      setAssignedTasks((current) => current.map((item) => item.id === task.id ? { ...item, ...payload } : item))
      setActivities((current) => current.map((item) => item.id === task.id ? { ...item, ...payload } : item))
      setSelectedWorkItem((current) => current?.id === task.id && current.workCollection === workCollection ? { ...current, ...payload } : current)
      return true
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error)
      setEmployeeActionError("Não foi possível atualizar a tarefa. Verifique a permissão do Firestore.")
      return false
    } finally { setEmployeeAction("") }
  }

  const workItemStatusLabel = (status) => ({
    pendente: "Pendente",
    andamento: "Em andamento",
    em_andamento: "Em andamento",
    concluida: "Concluída",
    cancelada: "Cancelada",
  }[status] || "Pendente")

  const workItemPriorityLabel = (priority) => ({ alta: "Alta", media: "Média", baixa: "Baixa" }[priority] || "Padrão")
  const workItemTypeLabel = (type) => ({
    tarefa: "Tarefa",
    voo: "Voo de drone",
    irrigacao: "Irrigação",
    pulverizacao: "Pulverização",
    colheita: "Colheita",
    manutencao: "Manutenção",
  }[type] || "Tarefa")

  return (
    <div className="zenith-home zenith-home--focused">
      <AppHeader />
      <main className="zenith-home__content">
        <section className="zenith-home__greeting">
          <div>
            <span className="zenith-kicker"><span className="material-symbols-outlined">wb_sunny</span> Visão geral da propriedade</span>
            <h1>Olá, <strong className="notranslate" translate="no">{firstName}</strong><span className="material-symbols-outlined">eco</span></h1>
            <button type="button" onClick={() => navigate("/cadastrar-fazenda")}>
              <span className="material-symbols-outlined">location_on</span>
              {farmData?.name ? <span className="notranslate" translate="no">{farmData.name}</span> : "Cadastre sua fazenda"}
            </button>
          </div>
          <div className="zenith-home__date">
            <span className="material-symbols-outlined">calendar_today</span>
            <span><small>Hoje</small>{new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date())}</span>
          </div>
        </section>

        <section className="zenith-home__hero-grid">

          <article className="weather-hero-card">
            <div className="weather-hero-card__copy">
              <span className="card-label"><span className="material-symbols-outlined">partly_cloudy_day</span> Clima atual</span>
              <div className="weather-temperature notranslate" translate="no"><strong>{temperature}</strong><sup>{temperature !== "--" ? "°" : ""}</sup></div>
              <h2>{weather?.conditionDescription || "Dados climáticos"}</h2>
              <p className={farmData?.municipio ? "notranslate" : undefined} translate={farmData?.municipio ? "no" : undefined}>{farmData?.municipio ? `${farmData.municipio}${farmData.uf ? `, ${farmData.uf}` : ""}` : "Cadastre a localização para acompanhar o clima."}</p>
            </div>
            <img src="/assets/image/soja-hero-cutout.webp" alt="Vagens e folhas de soja" />
            <div className="weather-metrics">
              <div><span className="material-symbols-outlined">humidity_percentage</span><small>Umidade</small><strong className="notranslate" translate="no">{weather?.humidity !== undefined ? `${weather.humidity}%` : "--"}</strong></div>
              <div><span className="material-symbols-outlined">air</span><small>Vento</small><strong className="notranslate" translate="no">{weather?.windSpeed !== undefined ? `${weather.windSpeed} km/h` : "--"}</strong></div>
              <div><span className="material-symbols-outlined">rainy</span><small>Precipitação</small><strong className="notranslate" translate="no">{weather?.rain !== undefined ? `${weather.rain} mm` : "--"}</strong></div>
            </div>
          </article>


          <article className="farm-showcase-card">
            <img src="/assets/image/Fundo_landing.jpg" alt="Lavoura ao pôr do sol" />
            <div className="farm-showcase-card__shade" />
            <div className="farm-showcase-card__top">
              <span><span className="material-symbols-outlined">agriculture</span> Minha fazenda</span>
            </div>
            <div className="farm-showcase-card__bottom">
              <span><small>Cultura principal</small><strong className="notranslate" translate="no">{cropLabel}</strong></span>
              <span><small>Área total</small><strong className="notranslate" translate="no">{farmData?.area_total ? `${farmData.area_total} ha` : "--"}</strong></span>
              <button type="button" onClick={() => navigate(hasFarm ? "/profile" : "/cadastrar-fazenda")}>{hasFarm ? "Ver propriedade" : "Cadastrar agora"}<span className="material-symbols-outlined">arrow_forward</span></button>
            </div>
          </article>
        </section>

        <section className="zenith-section">
          <div className="zenith-section__head"><div><span className="material-symbols-outlined">insights</span><span><small>Painel operacional</small><h2>O que você quer acompanhar?</h2></span></div><button type="button" onClick={() => openExplore("diagnostico")}>Ver todos os recursos <span className="material-symbols-outlined">arrow_forward</span></button></div>
          <div className="quick-summary-grid">
            {summary.map((item) => (
              <button type="button" key={item.label} onClick={() => openExplore(item.tab)}>
                <span className="quick-summary-grid__icon material-symbols-outlined">{item.icon}</span>
                <span><small>{item.label}</small><strong>{item.value}</strong></span>
                <span className="material-symbols-outlined">arrow_outward</span>
              </button>
            ))}
          </div>
        </section>

        <FarmCommandCenter activities={visibleActivities} onOpen={openExplore} />

        <section className="home-operation-grid">
          <article className="home-operation-card home-operation-card--feature home-analysis-card">
            <div><span className="card-label card-label--light"><span className="material-symbols-outlined">flight</span> Análise da lavoura por imagens</span><h2>Um olhar mais atento à sua lavoura.</h2><p>Analise sinais nas folhas com IA e acompanhe o plantio por visão computacional. Confirme os resultados em campo.</p><button type="button" onClick={() => openExplore("diagnostico")}>Analisar imagens <span className="material-symbols-outlined">arrow_forward</span></button></div>
            <img src="/assets/image/drone-plantio.webp" alt="Drone sobrevoando a plantação" />
          </article>
          <article className="home-activity-card">
            <div className="home-activity-card__head"><span><span className="material-symbols-outlined">{isEmployee ? "assignment" : "history"}</span><strong>{isEmployee ? "Minha jornada e tarefas" : "Atividades recentes"}</strong></span>{!isEmployee && <button type="button" onClick={() => openExplore("atividades")}>Ver todas</button>}</div>
            {isEmployee && <div className="employee-shift-card"><div><span className={`employee-shift-card__dot ${userData?.status === "trabalhando" ? "active" : ""}`} /><span><small>Jornada de hoje</small><strong>{userData?.status === "trabalhando" ? `Em campo desde ${userData?.entry || "agora"}` : "Aguardando entrada"}</strong></span></div><button type="button" disabled={Boolean(employeeAction)} onClick={() => updateWorkShift(userData?.status === "trabalhando" ? "end" : "start")}>{employeeAction === "start" || employeeAction === "end" ? "Salvando..." : userData?.status === "trabalhando" ? "Registrar saída" : "Registrar entrada"}</button></div>}
            {isEmployee && employeeActionError && <p className="employee-action-error">{employeeActionError}</p>}
            {isEmployee && employeeWorkItems.length ? employeeWorkItems.slice(0, 3).map((task) => (
              <div className="home-activity-row home-activity-row--task" key={`${task.workCollection}:${task.id}`}>
                <span className="material-symbols-outlined">assignment_turned_in</span>
                <span>
                  <strong>{task.title || "Tarefa da equipe"}</strong>
                  <small>{task.due && task.due !== "Sem prazo" ? `Prazo: ${task.due}` : workItemStatusLabel(task.status)}</small>
                </span>
                <div className="employee-task-action">
                  <button type="button" onClick={() => setSelectedWorkItem(task)}>Ver atividade</button>
                </div>
              </div>
            )) : !isEmployee && visibleActivities.length ? visibleActivities.slice(0, 3).map((activity, index) => (
              <div className="home-activity-row" key={activity.id || index}><span className="material-symbols-outlined">task_alt</span><span><strong>{activity.title || activity.name || "Atividade da fazenda"}</strong><small>{activity.date || "Registro recente"}</small></span><i>{activity.status || "Pendente"}</i></div>
            )) : <div className="home-activity-empty"><span className="material-symbols-outlined">event_available</span><div><strong>{isEmployee ? "Nenhuma tarefa recebida" : "Sua rotina começa aqui"}</strong><p>{isEmployee ? "As novas tarefas enviadas pelo responsável aparecerão aqui." : "Crie tarefas e acompanhe a operação da fazenda."}</p></div><button type="button" onClick={() => openExplore("atividades")}>Abrir atividades</button></div>}
          </article>
        </section>
      </main>
      <AppFooter />
      <MenuBar />
      {selectedWorkItem && createPortal((
        <div className="employee-work-modal" role="presentation" onClick={() => setSelectedWorkItem(null)}>
          <section
            className="employee-work-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-work-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="employee-work-dialog__header">
              <span className="material-symbols-outlined">assignment</span>
              <div>
                <small>ATIVIDADE ATRIBUÍDA</small>
                <h2 id="employee-work-title">{selectedWorkItem.title || "Tarefa da equipe"}</h2>
              </div>
              <button type="button" aria-label="Fechar atividade" onClick={() => setSelectedWorkItem(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>

            <div className="employee-work-dialog__status">
              <span className={`employee-work-status employee-work-status--${selectedWorkItem.status || "pendente"}`}>
                {workItemStatusLabel(selectedWorkItem.status)}
              </span>
              <span>Prioridade {workItemPriorityLabel(selectedWorkItem.priority)}</span>
            </div>

            <div className="employee-work-dialog__description">
              <small>O que precisa ser feito</small>
              <p>{selectedWorkItem.description || selectedWorkItem.title || "Consulte o responsável para mais orientações sobre esta atividade."}</p>
            </div>

            <div className="employee-work-dialog__details">
              <span><small>Prazo</small><strong>{selectedWorkItem.due || selectedWorkItem.date || "Sem prazo definido"}</strong></span>
              <span><small>Horário</small><strong>{selectedWorkItem.time || "Não informado"}</strong></span>
              <span><small>Tipo</small><strong>{workItemTypeLabel(selectedWorkItem.type)}</strong></span>
              <span><small>Responsável</small><strong>{selectedWorkItem.responsible || userData?.name || "Funcionário"}</strong></span>
              <span><small>Status</small><strong>{workItemStatusLabel(selectedWorkItem.status)}</strong></span>
            </div>

            <footer className="employee-work-dialog__actions">
              <button type="button" className="secondary" onClick={() => setSelectedWorkItem(null)}>Fechar</button>
              {selectedWorkItem.status === "pendente" && (
                <button
                  type="button"
                  disabled={Boolean(employeeAction)}
                  onClick={() => updateAssignedTask(selectedWorkItem, selectedWorkItem.progressStatus)}
                >
                  {employeeAction ? "Salvando..." : "Iniciar atividade"}
                </button>
              )}
              {(selectedWorkItem.status === "andamento" || selectedWorkItem.status === "em_andamento") && (
                <button
                  type="button"
                  disabled={Boolean(employeeAction)}
                  onClick={() => updateAssignedTask(selectedWorkItem, "concluida")}
                >
                  {employeeAction ? "Salvando..." : "Concluir atividade"}
                </button>
              )}
              {selectedWorkItem.status === "concluida" && (
                <span className="employee-work-dialog__completed">
                  <span className="material-symbols-outlined">check_circle</span>
                  {selectedWorkItem.ownerConfirmedAt ? "Finalização confirmada" : "Aguardando confirmação do responsável"}
                </span>
              )}
            </footer>
          </section>
        </div>
      ), document.body)}
    </div>
  )
}
