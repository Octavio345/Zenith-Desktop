import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import CustomSelect from "../Global/CustomSelect"
import "../../../styles/App/DiarioTab.css"

const entryTypes = {
  observacao: { name: "Observação", icon: "edit_note", color: "#8b9eb0" },
  tratamento: { name: "Tratamento", icon: "science", color: "#00ff88" },
  irrigacao: { name: "Irrigação", icon: "water_drop", color: "#00ccff" },
  alerta: { name: "Alerta", icon: "warning", color: "#ffaa00" }
}

const initialEntry = () => ({
  title: "",
  description: "",
  type: "observacao",
  date: new Date().toISOString().split("T")[0]
})

const entryTypeOptions = Object.entries(entryTypes).map(([value, type]) => ({
  value,
  label: type.name
}))

export default function DiarioTab() {
  const [entries, setEntries] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [newEntry, setNewEntry] = useState(initialEntry)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("todos")

  useEffect(() => {
    const saved = localStorage.getItem("diaryEntries")
    if (saved) {
      setEntries(JSON.parse(saved))
      return
    }

    const sampleEntries = [
      {
        id: 1,
        title: "Aplicação de fungicida",
        description: "Aplicação preventiva na área norte da fazenda. Clima favorável, sem ventos.",
        type: "tratamento",
        date: "2024-03-20",
        time: "08:30"
      },
      {
        id: 2,
        title: "Irrigação realizada",
        description: "Sistema de irrigação ativado por 2 horas na área central.",
        type: "irrigacao",
        date: "2024-03-19",
        time: "16:00"
      },
      {
        id: 3,
        title: "Pragas detectadas",
        description: "Foco de lagarta identificado na borda da plantação. Monitoramento necessário.",
        type: "alerta",
        date: "2024-03-18",
        time: "10:15"
      }
    ]

    setEntries(sampleEntries)
    localStorage.setItem("diaryEntries", JSON.stringify(sampleEntries))
  }, [])

  const saveEntries = (nextEntries) => {
    setEntries(nextEntries)
    localStorage.setItem("diaryEntries", JSON.stringify(nextEntries))
  }

  const addEntry = () => {
    if (!newEntry.title.trim()) return

    const entry = {
      id: Date.now(),
      ...newEntry,
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    }

    saveEntries([entry, ...entries])
    setNewEntry(initialEntry())
    setShowForm(false)
  }

  const deleteEntry = (id) => {
    saveEntries(entries.filter(entry => entry.id !== id))
    setDeleteTarget(null)
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
  }

  const filteredEntries = entries.filter(entry => {
    const text = `${entry.title} ${entry.description}`.toLowerCase()
    const matchesSearch = text.includes(searchTerm.toLowerCase())
    const matchesType = filterType === "todos" || entry.type === filterType
    return matchesSearch && matchesType
  })

  const stats = [
    { icon: "menu_book", label: "Registros", value: entries.length },
    { icon: "science", label: "Tratamentos", value: entries.filter(e => e.type === "tratamento").length },
    { icon: "water_drop", label: "Irrigações", value: entries.filter(e => e.type === "irrigacao").length },
    { icon: "warning", label: "Alertas", value: entries.filter(e => e.type === "alerta").length }
  ]

  return (
    <div className="diario-container">
      <div className="diario-header">
        <div>
          <h2>Diário de Campo</h2>
          <p>Registre observações, aplicações e ocorrências importantes da fazenda.</p>
        </div>
        <button className="diario-add-btn" onClick={() => setShowForm(true)}>
          <span className="material-symbols-outlined">add</span>
          Nova entrada
        </button>
      </div>

      <div className="diario-toolbar">
        <div className="diario-search">
          <span className="material-symbols-outlined">search</span>
          <input
            type="text"
            placeholder="Buscar por título ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="diario-filter">
          <span className="material-symbols-outlined">filter_list</span>
          <CustomSelect
            value={filterType}
            onChange={setFilterType}
            options={[{ value: "todos", label: "Todos os tipos" }, ...entryTypeOptions]}
          />
        </div>
      </div>

      <div className="diario-summary-grid">
        {stats.map(item => (
          <div key={item.label} className="diario-summary-card">
            <span className="material-symbols-outlined">{item.icon}</span>
            <div>
              <strong>{item.value}</strong>
              <small>{item.label}</small>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div className="diario-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="diario-form" initial={{ scale: 0.94, y: 18 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 18 }}>
              <div className="diario-form-header">
                <h3>Nova entrada</h3>
                <button className="close-btn" onClick={() => setShowForm(false)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="form-group">
                <label>Título</label>
                <input
                  type="text"
                  placeholder="Ex: Aplicação de fungicida"
                  value={newEntry.title}
                  onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  rows="4"
                  placeholder="Detalhes da atividade..."
                  value={newEntry.description}
                  onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Tipo</label>
                <CustomSelect
                  value={newEntry.type}
                  onChange={(type) => setNewEntry({ ...newEntry, type })}
                  options={entryTypeOptions}
                />
              </div>

              <button className="submit-btn" onClick={addEntry}>Salvar entrada</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="diario-list">
        {filteredEntries.length === 0 ? (
          <div className="diario-empty">
            <span className="material-symbols-outlined">menu_book</span>
            <p>Nenhuma entrada encontrada</p>
            <p className="empty-hint">Crie um registro ou ajuste os filtros.</p>
          </div>
        ) : (
          filteredEntries.map((entry, index) => {
            const type = entryTypes[entry.type] || entryTypes.observacao

            return (
              <motion.div
                key={entry.id}
                className="diario-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => setSelectedEntry(entry)}
              >
                <div className="diario-card-date">
                  <span className="day">{formatDate(entry.date)}</span>
                  <span className="time">{entry.time}</span>
                </div>

                <div className="diario-card-content">
                  <div className="diario-card-header">
                    <span className="type-icon" style={{ background: `${type.color}20`, color: type.color }}>
                      <span className="material-symbols-outlined">{type.icon}</span>
                    </span>
                    <h3>{entry.title}</h3>
                    <button
                      className="delete-entry"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget(entry)
                      }}
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                  <small style={{ color: type.color, fontWeight: 800 }}>{type.name}</small>
                  <p>{entry.description}</p>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      <AnimatePresence>
        {selectedEntry && (
          <motion.div className="diario-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedEntry(null)}>
            <motion.div className="diario-detail" initial={{ scale: 0.94, y: 18 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 18 }} onClick={(e) => e.stopPropagation()}>
              <button className="close-btn" onClick={() => setSelectedEntry(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
              <div className="detail-header">
                <span
                  className="type-icon large"
                  style={{
                    background: `${(entryTypes[selectedEntry.type] || entryTypes.observacao).color}20`,
                    color: (entryTypes[selectedEntry.type] || entryTypes.observacao).color
                  }}
                >
                  <span className="material-symbols-outlined">{(entryTypes[selectedEntry.type] || entryTypes.observacao).icon}</span>
                </span>
                <div>
                  <h3>{selectedEntry.title}</h3>
                  <p className="detail-date">{new Date(selectedEntry.date).toLocaleDateString("pt-BR")} • {selectedEntry.time}</p>
                </div>
              </div>
              <p className="detail-description">{selectedEntry.description}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <motion.div className="diario-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteTarget(null)}>
            <motion.div className="diario-detail" initial={{ scale: 0.94, y: 18 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 18 }} onClick={(e) => e.stopPropagation()}>
              <button className="close-btn" onClick={() => setDeleteTarget(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
              <div className="detail-header">
                <span className="type-icon large" style={{ background: "rgba(255, 68, 68, 0.12)", color: "#ff6b6b" }}>
                  <span className="material-symbols-outlined">delete</span>
                </span>
                <div>
                  <h3>Excluir entrada?</h3>
                  <p className="detail-date">Essa ação remove o registro do diário.</p>
                </div>
              </div>
              <p className="detail-description">{deleteTarget.title}</p>
              <div className="edit-form-actions">
                <button className="cancel-btn" onClick={() => setDeleteTarget(null)}>Cancelar</button>
                <button className="save-btn" onClick={() => deleteEntry(deleteTarget.id)}>Excluir</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
