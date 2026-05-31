import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import CustomSelect from "../Global/CustomSelect"
import "../../../styles/App/AtividadesTab.css"

export default function AtividadesTab() {
  const [activities, setActivities] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filterType, setFilterType] = useState("todas")
  const [filterStatus, setFilterStatus] = useState("todos")
  const [searchTerm, setSearchTerm] = useState("")
  const [newActivity, setNewActivity] = useState({
    title: "",
    description: "",
    type: "tarefa",
    status: "pendente",
    priority: "media",
    date: new Date().toISOString().split("T")[0],
    time: "",
    responsible: ""
  })

  // Cores mais vibrantes para os ícones
  const activityTypes = [
    { id: "tarefa", name: "Tarefa", icon: "assignment", color: "#2ecc71" },
    { id: "voo", name: "Voo de Drone", icon: "flight", color: "#3498db" },
    { id: "irrigacao", name: "Irrigação", icon: "water_drop", color: "#1abc9c" },
    { id: "pulverizacao", name: "Pulverização", icon: "spray", color: "#f39c12" },
    { id: "colheita", name: "Colheita", icon: "agriculture", color: "#27ae60" },
    { id: "manutencao", name: "Manutenção", icon: "handyman", color: "#e74c3c" }
  ]

  const priorities = [
    { id: "alta", name: "Alta", icon: "priority_high", color: "#e74c3c" },
    { id: "media", name: "Média", icon: "drag_handle", color: "#f39c12" },
    { id: "baixa", name: "Baixa", icon: "low_priority", color: "#2ecc71" }
  ]

  const statuses = [
    { id: "pendente", name: "Pendente", icon: "pending", color: "#f39c12" },
    { id: "em_andamento", name: "Em andamento", icon: "play_circle", color: "#3498db" },
    { id: "concluida", name: "Concluída", icon: "check_circle", color: "#2ecc71" },
    { id: "cancelada", name: "Cancelada", icon: "cancel", color: "#e74c3c" }
  ]

  const typeOptions = activityTypes.map(type => ({ value: type.id, label: type.name }))
  const priorityOptions = priorities.map(priority => ({ value: priority.id, label: priority.name }))
  const statusOptions = statuses.map(status => ({ value: status.id, label: status.name }))

  useEffect(() => {
    const saved = localStorage.getItem("activities")
    if (saved) {
      setActivities(JSON.parse(saved))
    } else {
      const sampleActivities = [
        { id: 1, title: "Aplicação de fungicida", description: "Aplicar fungicida na área norte da fazenda", type: "pulverizacao", status: "concluida", priority: "alta", date: "2024-03-20", time: "08:00", responsible: "João Silva", createdAt: new Date().toISOString() },
        { id: 2, title: "Voo de mapeamento", description: "Realizar voo de mapeamento da área sul", type: "voo", status: "em_andamento", priority: "media", date: "2024-03-21", time: "14:00", responsible: "Drone Team", createdAt: new Date().toISOString() },
        { id: 3, title: "Irrigação programada", description: "Ativar sistema de irrigação na área central", type: "irrigacao", status: "pendente", priority: "alta", date: "2024-03-22", time: "06:00", responsible: "Sistema Automático", createdAt: new Date().toISOString() },
        { id: 4, title: "Manutenção de equipamentos", description: "Revisão dos pulverizadores", type: "manutencao", status: "pendente", priority: "media", date: "2024-03-23", time: "09:00", responsible: "Equipe Manutenção", createdAt: new Date().toISOString() }
      ]
      setActivities(sampleActivities)
      localStorage.setItem("activities", JSON.stringify(sampleActivities))
    }
  }, [])

  const saveActivities = (newActivities) => {
    setActivities(newActivities)
    localStorage.setItem("activities", JSON.stringify(newActivities))
  }

  const addActivity = () => {
    if (!newActivity.title.trim()) return
    const activity = { id: Date.now(), ...newActivity, createdAt: new Date().toISOString() }
    saveActivities([activity, ...activities])
    setNewActivity({
      title: "", description: "", type: "tarefa", status: "pendente",
      priority: "media", date: new Date().toISOString().split("T")[0], time: "", responsible: ""
    })
    setShowForm(false)
  }

  const updateActivity = () => {
    if (!selectedActivity) return
    saveActivities(activities.map(a => a.id === selectedActivity.id ? { ...selectedActivity } : a))
    setSelectedActivity(null)
  }

  const deleteActivity = (id) => {
    saveActivities(activities.filter(a => a.id !== id))
    setDeleteTarget(null)
  }

  const changeStatus = (id, newStatus) => {
    saveActivities(activities.map(a => a.id === id ? { ...a, status: newStatus } : a))
  }

  const filteredActivities = activities.filter(activity => {
    const matchesType = filterType === "todas" || activity.type === filterType
    const matchesStatus = filterStatus === "todos" || activity.status === filterStatus
    const matchesSearch = activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          activity.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesType && matchesStatus && matchesSearch
  })

  const sortedActivities = [...filteredActivities].sort((a, b) => {
    return new Date(b.date + " " + b.time) - new Date(a.date + " " + a.time)
  })

  const totalActivities = activities.length
  const pendingActivities = activities.filter(a => a.status === "pendente").length
  const completedActivities = activities.filter(a => a.status === "concluida").length
  const inProgressActivities = activities.filter(a => a.status === "em_andamento").length

  const getTypeInfo = (typeId) => activityTypes.find(t => t.id === typeId) || activityTypes[0]
  const getPriorityInfo = (priorityId) => priorities.find(p => p.id === priorityId) || priorities[1]
  const getStatusInfo = (statusId) => statuses.find(s => s.id === statusId) || statuses[0]

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (date.toDateString() === today.toDateString()) return "Hoje"
    if (date.toDateString() === tomorrow.toDateString()) return "Amanhã"
    return date.toLocaleDateString("pt-BR")
  }

  const isOverdue = (activity) => {
    if (activity.status === "concluida" || activity.status === "cancelada") return false
    return new Date(activity.date + " " + activity.time) < new Date()
  }

  return (
    <div className="atividades-container">
      {/* Header */}
      <div className="atividades-header">
        <div>
          <h2>Atividades</h2>
          <p>Gerencie tarefas, responsáveis e operações do campo.</p>
        </div>
        <button className="add-activity-btn" onClick={() => setShowForm(true)}>
          <span className="material-symbols-outlined">add</span>
          Nova atividade
        </button>
      </div>

      {/* Estatísticas */}
      <div className="atividades-stats">
        <div className="stat-card">
          <span className="material-symbols-outlined">assignment</span>
          <div>
            <strong>{totalActivities}</strong>
            <p>Total</p>
          </div>
        </div>
        <div className="stat-card pending">
          <span className="material-symbols-outlined">pending</span>
          <div>
            <strong>{pendingActivities}</strong>
            <p>Pendentes</p>
          </div>
        </div>
        <div className="stat-card progress">
          <span className="material-symbols-outlined">play_circle</span>
          <div>
            <strong>{inProgressActivities}</strong>
            <p>Em andamento</p>
          </div>
        </div>
        <div className="stat-card completed">
          <span className="material-symbols-outlined">check_circle</span>
          <div>
            <strong>{completedActivities}</strong>
            <p>Concluídas</p>
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="atividades-controls">
        <div className="search-bar">
          <span className="material-symbols-outlined">search</span>
          <input
            type="text"
            placeholder="Buscar atividade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filters-row">
          <CustomSelect
            className="filter-select"
            value={filterType}
            onChange={setFilterType}
            options={[{ value: "todas", label: "Todos os tipos" }, ...typeOptions]}
          />
          <CustomSelect
            className="filter-select"
            value={filterStatus}
            onChange={setFilterStatus}
            options={[{ value: "todos", label: "Todos os status" }, ...statusOptions]}
          />
        </div>
      </div>

      {/* Lista */}
      <div className="activities-list">
        {sortedActivities.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">assignment_turned_in</span>
            <p>Nenhuma atividade encontrada</p>
            <button onClick={() => setShowForm(true)}>Criar atividade</button>
          </div>
        ) : (
          sortedActivities.map((activity, index) => {
            const typeInfo = getTypeInfo(activity.type)
            const priorityInfo = getPriorityInfo(activity.priority)
            const statusInfo = getStatusInfo(activity.status)
            const overdue = isOverdue(activity)

            return (
              <motion.div
                key={activity.id}
                className={`activity-card ${activity.status} ${overdue ? "overdue" : ""}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.25 }}
                onClick={() => setSelectedActivity(activity)}
              >
                <div className="activity-header">
                  <div className="activity-icon" style={{ background: `${typeInfo.color}1a`, color: typeInfo.color }}>
                    <span className="material-symbols-outlined">{typeInfo.icon}</span>
                  </div>
                  <div className="activity-info">
                    <h3>{activity.title}</h3>
                    <div className="activity-meta">
                      <span className="activity-type">{typeInfo.name}</span>
                      <span className="activity-date">
                        <span className="material-symbols-outlined">schedule</span>
                        {formatDate(activity.date)} {activity.time && `às ${activity.time}`}
                      </span>
                    </div>
                  </div>
                  <div className="activity-badges">
                    <div className={`priority-badge ${activity.priority}`}>
                      <span className="material-symbols-outlined">{priorityInfo.icon}</span>
                      {priorityInfo.name}
                    </div>
                    <div className={`status-badge ${activity.status}`}>
                      <span className="material-symbols-outlined">{statusInfo.icon}</span>
                      {statusInfo.name}
                    </div>
                  </div>
                </div>

                {activity.description && (
                  <div className="activity-description">
                    <p>{activity.description}</p>
                  </div>
                )}

                <div className="activity-info-row">
                  {activity.responsible && (
                    <div className="activity-responsible">
                      <span className="material-symbols-outlined">person</span>
                      <span>{activity.responsible}</span>
                    </div>
                  )}
                  {overdue && activity.status !== "concluida" && (
                    <div className="overdue-badge">
                      <span className="material-symbols-outlined">warning</span>
                      Atrasada
                    </div>
                  )}
                </div>

                <div className="activity-actions">
                  {activity.status === "pendente" && (
                    <button
                      className="action-start"
                      onClick={(e) => { e.stopPropagation(); changeStatus(activity.id, "em_andamento") }}
                    >
                      <span className="material-symbols-outlined">play_arrow</span>
                      Iniciar
                    </button>
                  )}
                  {activity.status === "em_andamento" && (
                    <button
                      className="action-complete"
                      onClick={(e) => { e.stopPropagation(); changeStatus(activity.id, "concluida") }}
                    >
                      <span className="material-symbols-outlined">check</span>
                      Concluir
                    </button>
                  )}
                  <button
                    className="action-delete"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(activity) }}
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Modal Nova */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="atividades-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowForm(false)}
          >
            <motion.div
              className="activity-form"
              initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="form-header">
                <h3>Nova Atividade</h3>
                <button className="close-btn" onClick={() => setShowForm(false)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="form-group">
                <label>Título</label>
                <input type="text" placeholder="Ex: Aplicação de fungicida"
                  value={newActivity.title}
                  onChange={(e) => setNewActivity({...newActivity, title: e.target.value})} />
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <textarea rows="3" placeholder="Detalhes da atividade..."
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({...newActivity, description: e.target.value})} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tipo</label>
                  <CustomSelect value={newActivity.type}
                    onChange={(type) => setNewActivity({ ...newActivity, type })}
                    options={typeOptions} />
                </div>
                <div className="form-group">
                  <label>Prioridade</label>
                  <CustomSelect value={newActivity.priority}
                    onChange={(priority) => setNewActivity({ ...newActivity, priority })}
                    options={priorityOptions} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Data</label>
                  <input type="date" value={newActivity.date}
                    onChange={(e) => setNewActivity({...newActivity, date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Horário</label>
                  <input type="time" value={newActivity.time}
                    onChange={(e) => setNewActivity({...newActivity, time: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label>Responsável</label>
                <input type="text" placeholder="Nome do responsável"
                  value={newActivity.responsible}
                  onChange={(e) => setNewActivity({...newActivity, responsible: e.target.value})} />
              </div>

              <button className="submit-btn" onClick={addActivity}>Criar atividade</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Editar */}
      <AnimatePresence>
        {selectedActivity && (
          <motion.div
            className="atividades-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelectedActivity(null)}
          >
            <motion.div
              className="activity-form"
              initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="form-header">
                <h3>Editar Atividade</h3>
                <button className="close-btn" onClick={() => setSelectedActivity(null)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="form-group">
                <label>Título</label>
                <input type="text" value={selectedActivity.title}
                  onChange={(e) => setSelectedActivity({...selectedActivity, title: e.target.value})} />
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <textarea rows="3" value={selectedActivity.description}
                  onChange={(e) => setSelectedActivity({...selectedActivity, description: e.target.value})} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tipo</label>
                  <CustomSelect value={selectedActivity.type}
                    onChange={(type) => setSelectedActivity({ ...selectedActivity, type })}
                    options={typeOptions} />
                </div>
                <div className="form-group">
                  <label>Prioridade</label>
                  <CustomSelect value={selectedActivity.priority}
                    onChange={(priority) => setSelectedActivity({ ...selectedActivity, priority })}
                    options={priorityOptions} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Data</label>
                  <input type="date" value={selectedActivity.date}
                    onChange={(e) => setSelectedActivity({...selectedActivity, date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Horário</label>
                  <input type="time" value={selectedActivity.time || ""}
                    onChange={(e) => setSelectedActivity({...selectedActivity, time: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label>Responsável</label>
                <input type="text" value={selectedActivity.responsible || ""}
                  onChange={(e) => setSelectedActivity({...selectedActivity, responsible: e.target.value})} />
              </div>

              <button className="submit-btn" onClick={updateActivity}>Salvar alterações</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Excluir */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            className="atividades-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              className="activity-form confirm-form"
              initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="form-header">
                <h3>Excluir atividade?</h3>
                <button className="close-btn" onClick={() => setDeleteTarget(null)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <p className="confirm-text">
                Você tem certeza que quer remover <strong>{deleteTarget.title}</strong>?
              </p>
              <div className="form-row">
                <button className="submit-btn secondary-btn" onClick={() => setDeleteTarget(null)}>
                  Cancelar
                </button>
                <button className="submit-btn danger-btn" onClick={() => deleteActivity(deleteTarget.id)}>
                  Excluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}