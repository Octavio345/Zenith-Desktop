import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { deleteApp, initializeApp } from "firebase/app"
import { createUserWithEmailAndPassword, deleteUser, getAuth, signOut } from "firebase/auth"
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore"
import { auth, db, firebaseConfig } from "../../services/firebase"
import { isAwaitingOwnerConfirmation, isConfirmedWorkItemExpired } from "../../services/workItemLifecycle"
import MenuBar from "../../components/App/Global/MenuBar"
import AppHeader from "../../components/App/Global/AppHeader"
import AppFooter from "../../components/App/Global/AppFooter"
import DroneIcon from "../../components/App/Global/DroneIcon"
import { ACCOUNT_ROLES, isAccountBlocked } from "../../services/accessControl"
import "../../styles/App/TeamAccess.css"

const DRONE_MODELS = [
  "DJI Agras T10",
  "DJI Agras T20P",
  "DJI Agras T25",
  "DJI Agras T30",
  "DJI Agras T40",
  "DJI Mavic 3 Multispectral",
  "DJI Phantom 4 Multispectral",
  "XAG P100 Pro",
]

const statusLabels = {
  online: "Online",
  offline: "Offline",
  trabalhando: "Trabalhando",
  pausa: "Em pausa",
  ausente: "Ausente",
}

const taskStatusMeta = {
  pendente: { label: "Pendente", icon: "pending_actions" },
  andamento: { label: "Em andamento", icon: "play_circle" },
  em_andamento: { label: "Em andamento", icon: "play_circle" },
  concluida: { label: "Concluída", icon: "task_alt" },
}

const createInitialTaskDraft = () => ({
  title: "",
  description: "",
  type: "tarefa",
  priority: "media",
  date: new Date().toISOString().split("T")[0],
  time: "",
})

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
const isStrongPassword = (value) => value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value)
const onlyDigits = (value = "") => String(value).replace(/\D/g, "")
const VALID_BRAZILIAN_DDDS = new Set(["11","12","13","14","15","16","17","18","19","21","22","24","27","28","31","32","33","34","35","37","38","41","42","43","44","45","46","47","48","49","51","53","54","55","61","62","63","64","65","66","67","68","69","71","73","74","75","77","79","81","82","83","84","85","86","87","88","89","91","92","93","94","95","96","97","98","99"])

function isValidCPF(digits) {
  if (!/^\d{11}$/.test(digits) || /^(\d)\1+$/.test(digits)) return false
  const checkDigit = (base, factor) => {
    const sum = base.split("").reduce((total, number) => total + Number(number) * factor--, 0)
    const remainder = (sum * 10) % 11
    return remainder === 10 ? 0 : remainder
  }
  return checkDigit(digits.slice(0, 9), 10) === Number(digits[9]) && checkDigit(digits.slice(0, 10), 11) === Number(digits[10])
}

function isValidCNPJ(digits) {
  if (!/^\d{14}$/.test(digits) || /^(\d)\1+$/.test(digits)) return false
  const checkDigit = (base, weights) => {
    const sum = base.split("").reduce((total, number, index) => total + Number(number) * weights[index], 0)
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }
  return checkDigit(digits.slice(0, 12), [5,4,3,2,9,8,7,6,5,4,3,2]) === Number(digits[12]) && checkDigit(digits.slice(0, 13), [6,5,4,3,2,9,8,7,6,5,4,3,2]) === Number(digits[13])
}

function isValidBrazilianPhone(digits) {
  if (!/^\d{10,11}$/.test(digits) || /^(\d)\1+$/.test(digits) || !VALID_BRAZILIAN_DDDS.has(digits.slice(0, 2))) return false
  const number = digits.slice(2)
  return digits.length === 11
    ? number.startsWith("9") && !/^9(\d)\1{7}$/.test(number)
    : /^[2-5]/.test(number) && !/^(\d)\1{7}$/.test(number)
}

function formatBrazilianPhone(value = "") {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function formatBrazilianDocument(value = "", personType = "CPF") {
  const limit = personType === "PJ" ? 14 : 11
  const digits = onlyDigits(value).slice(0, limit)
  if (personType === "PJ") {
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
  }
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
}

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

function getTaskDate(task) {
  const rawDate = task.completedAt || task.updatedAt || task.createdAt
  if (!rawDate) return null
  const date = rawDate?.toDate ? rawDate.toDate() : new Date(rawDate)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatTaskDate(value) {
  if (!value) return ""
  const date = value?.toDate ? value.toDate() : new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(date)
}

function getCompletionRate(tasks, periodInDays = null) {
  const cutoff = periodInDays ? Date.now() - periodInDays * 24 * 60 * 60 * 1000 : null
  const scopedTasks = cutoff
    ? tasks.filter((task) => {
        const date = getTaskDate(task)
        return date && date.getTime() >= cutoff
      })
    : tasks

  if (scopedTasks.length === 0) return null
  const completed = scopedTasks.filter((task) => task.status === "concluida").length
  return Math.round((completed / scopedTasks.length) * 100)
}

export default function AdminTeamDashboard() {
  const location = useLocation()
  const assignTaskRef = useRef(null)
  const taskInputRef = useRef(null)
  const newEmployeeFormRef = useRef(null)
  const newEmployeeNameRef = useRef(null)
  const droneSelectRef = useRef(null)
  const [employees, setEmployees] = useState([])
  const [selectedId, setSelectedId] = useState("")
  const [isTeamLoading, setIsTeamLoading] = useState(true)
  const [filters, setFilters] = useState({ employee: "", sector: "todos", status: "todos", date: "" })
  const [taskDraft, setTaskDraft] = useState(createInitialTaskDraft)
  const [detailTab, setDetailTab] = useState("summary")
  const [isAssigningTask, setIsAssigningTask] = useState(false)
  const [taskAssignmentMessage, setTaskAssignmentMessage] = useState({ type: "", text: "" })
  const [showNewEmployee, setShowNewEmployee] = useState(false)
  const [showEmployeePassword, setShowEmployeePassword] = useState(false)
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false)
  const [employeeFormMessage, setEmployeeFormMessage] = useState({ type: "", text: "" })
  const [isEditingEmployee, setIsEditingEmployee] = useState(false)
  const [isSavingEmployee, setIsSavingEmployee] = useState(false)
  const [employeeEditMessage, setEmployeeEditMessage] = useState({ type: "", text: "" })
  const [deleteEmployeeTarget, setDeleteEmployeeTarget] = useState(null)
  const [isDeletingEmployee, setIsDeletingEmployee] = useState(false)
  const [deleteEmployeeError, setDeleteEmployeeError] = useState("")
  const [employeeEdit, setEmployeeEdit] = useState({
    name: "",
    age: "",
    phone: "",
    personType: "CPF",
    document: "",
    employmentType: "CLT",
    position: "",
    sector: "",
  })
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    email: "",
    password: "",
    age: "",
    phone: "",
    personType: "CPF",
    document: "",
    employmentType: "CLT",
    position: "",
    sector: "",
    droneModel: "",
    role: ACCOUNT_ROLES.EMPLOYEE,
  })

  useEffect(() => {
    const ownerId = auth.currentUser?.uid
    if (!ownerId) {
      setIsTeamLoading(false)
      return undefined
    }

    const employeesQuery = query(collection(db, "employees"), where("ownerId", "==", ownerId))
    const legacyEmployeesQuery = query(collection(db, "users"), where("ownerId", "==", ownerId))
    const legacyTasksQuery = query(collection(db, "tasks"), where("ownerId", "==", ownerId))
    const ownerActivitiesQuery = query(collection(db, "activities"), where("ownerId", "==", ownerId))
    let employeeDocs = []
    let activities = []

    const syncTeam = () => {
      const allWorkItems = [
        ...activities
          .filter((activity) => activity.scope === "individual" && activity.assigneeId)
          .map((activity) => ({
            ...activity,
            employeeId: activity.assigneeId,
            due: activity.date || "Sem prazo",
            workCollection: "activities",
          })),
      ]
      const visibleTasks = allWorkItems.filter((task) => !isConfirmedWorkItemExpired(task))
      const operationalEmployees = employeeDocs.filter((docSnap) => (
        !isAccountBlocked(docSnap.data()) &&
        (docSnap.data().role === ACCOUNT_ROLES.EMPLOYEE || docSnap.data().role === ACCOUNT_ROLES.COLLABORATOR)
      ))

      if (operationalEmployees.length > 0) {
        setEmployees(operationalEmployees.map((docSnap) => {
            const data = docSnap.data()
            const employeeTasks = visibleTasks.filter((task) => task.employeeId === docSnap.id)
            const employeeHistory = allWorkItems.filter((task) => task.employeeId === docSnap.id)

            return {
              id: docSnap.id,
              name: data.name || "Funcionário",
              email: data.email || "",
              age: data.age || "",
              phone: data.phone || "",
              personType: data.type || "CPF",
              document: data.document || "",
              employmentType: data.employmentType || "CLT",
              position: data.position || "Funcionário de campo",
              sector: data.sector || "Campo",
              status: data.status || "offline",
              entry: data.entry || "--:--",
              exit: data.exit || "--:--",
              hours: Number(data.hours) || 0,
              pending: employeeTasks.filter((task) => task.status === "pendente").length,
              active: employeeTasks.filter((task) => task.status === "andamento" || task.status === "em_andamento").length,
              done: employeeHistory.filter((task) => task.status === "concluida").length,
              productivity: getCompletionRate(employeeHistory),
              daily: getCompletionRate(employeeHistory, 1),
              weekly: getCompletionRate(employeeHistory, 7),
              monthly: getCompletionRate(employeeHistory, 30),
              tasks: employeeTasks,
              delays: Number(data.delays) || 0,
              absences: Number(data.absences) || 0,
              lastActivity: data.lastActivity || "Sem atividade registrada",
              droneModel: data.droneModel || "",
            }
          }))
        setSelectedId((current) => current || operationalEmployees[0].id)
      } else {
        setEmployees([])
        setSelectedId("")
      }
    }

    const handleError = (error) => {
      console.error("Erro ao carregar equipe:", error)
      setIsTeamLoading(false)
    }
    const unsubscribeEmployees = onSnapshot(employeesQuery, (snapshot) => {
      employeeDocs = snapshot.docs
      syncTeam()
      setIsTeamLoading(false)
    }, handleError)
    const unsubscribeLegacyEmployees = onSnapshot(legacyEmployeesQuery, (snapshot) => {
      Promise.all(snapshot.docs.map(async (legacyDoc) => {
        const data = legacyDoc.data()
        if (![ACCOUNT_ROLES.EMPLOYEE, ACCOUNT_ROLES.COLLABORATOR].includes(data.role)) return
        await setDoc(doc(db, "employees", legacyDoc.id), data)
        await deleteDoc(doc(db, "users", legacyDoc.id))
      })).catch(handleError)
    }, handleError)
    const unsubscribeLegacyTasks = onSnapshot(legacyTasksQuery, (snapshot) => {
      Promise.all(snapshot.docs.map(async (legacyDoc) => {
        const data = legacyDoc.data()
        await setDoc(doc(db, "activities", legacyDoc.id), {
          ...data,
          scope: "individual",
          assigneeId: data.assigneeId || data.employeeId,
          status: data.status === "andamento" ? "em_andamento" : data.status,
        })
        await deleteDoc(doc(db, "tasks", legacyDoc.id))
      })).catch(handleError)
    }, handleError)
    const unsubscribeActivities = onSnapshot(ownerActivitiesQuery, (snapshot) => {
      activities = snapshot.docs.map((activityDoc) => ({ id: activityDoc.id, ...activityDoc.data() }))
      syncTeam()
      setIsTeamLoading(false)
    }, handleError)
    const lifecycleTimer = window.setInterval(syncTeam, 60000)

    return () => {
      unsubscribeEmployees()
      unsubscribeLegacyEmployees()
      unsubscribeLegacyTasks()
      unsubscribeActivities()
      window.clearInterval(lifecycleTimer)
    }
  }, [])

  const sectors = useMemo(() => ["todos", ...new Set(employees.map((employee) => employee.sector))], [employees])

  const filteredEmployees = useMemo(() => employees.filter((employee) => {
    const byEmployee = !filters.employee || employee.name.toLowerCase().includes(filters.employee.toLowerCase())
    const bySector = filters.sector === "todos" || employee.sector === filters.sector
    const byStatus = filters.status === "todos" || employee.status === filters.status
    return byEmployee && bySector && byStatus
  }), [employees, filters])

  const selected = filteredEmployees.find((employee) => employee.id === selectedId) || filteredEmployees[0] || employees[0]

  useEffect(() => {
    if (location.hash === "#novo-funcionario") {
      setShowNewEmployee(true)
      window.setTimeout(() => {
        newEmployeeFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
        newEmployeeNameRef.current?.focus()
      }, 120)
      return
    }

    if (location.hash === "#configurar-drone") {
      window.setTimeout(() => {
        droneSelectRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
        droneSelectRef.current?.focus()
      }, 120)
      return
    }

    if (location.hash !== "#nova-tarefa") return

    setDetailTab("tasks")
    window.setTimeout(() => {
      assignTaskRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      taskInputRef.current?.focus()
    }, 120)
  }, [location.hash, selected?.id])

  const totals = useMemo(() => ({
    employees: employees.length,
    working: employees.filter((employee) => employee.status === "trabalhando" || employee.status === "online").length,
    pending: employees.reduce((sum, employee) => sum + employee.pending, 0),
    productivity: (() => {
      const measured = employees.filter((employee) => employee.productivity !== null)
      if (measured.length === 0) return null
      return Math.round(measured.reduce((sum, employee) => sum + employee.productivity, 0) / measured.length)
    })(),
  }), [employees])

  const assignTask = async () => {
    const title = taskDraft.title.trim()
    const description = taskDraft.description.trim()
    if (!selected) {
      setTaskAssignmentMessage({ type: "error", text: "Selecione um funcionário antes de atribuir a tarefa." })
      return
    }
    if (!title) {
      setTaskAssignmentMessage({ type: "error", text: "Digite o nome da tarefa antes de enviar." })
      taskInputRef.current?.focus()
      return
    }
    if (!auth.currentUser?.uid) {
      setTaskAssignmentMessage({ type: "error", text: "Sua sessão expirou. Entre novamente para atribuir tarefas." })
      return
    }

    setIsAssigningTask(true)
    setTaskAssignmentMessage({ type: "", text: "" })
    try {
      const taskPayload = {
        employeeId: selected.id,
        employeeName: selected.name,
        title,
        description,
        type: taskDraft.type,
        status: "pendente",
        priority: taskDraft.priority,
        date: taskDraft.date,
        due: taskDraft.date || "Sem prazo",
        time: taskDraft.time,
        responsible: selected.name,
        ownerId: auth.currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await addDoc(collection(db, "activities"), {
        ...taskPayload,
        scope: "individual",
        assigneeId: selected.id,
      })
      setTaskDraft(createInitialTaskDraft())
      setTaskAssignmentMessage({ type: "success", text: `Tarefa atribuída a ${selected.name}.` })
    } catch (error) {
      console.error("Erro ao atribuir tarefa:", error)
      setTaskAssignmentMessage({
        type: "error",
        text: error?.code === "permission-denied"
          ? "O Firebase recusou a operação. Confirme se as regras atuais do Firestore foram publicadas."
          : "Não foi possível atribuir a tarefa. Tente novamente.",
      })
    } finally {
      setIsAssigningTask(false)
    }
  }

  const registerEmployee = async () => {
    if (!newEmployee.name.trim() || !isValidEmail(newEmployee.email)) {
      setEmployeeFormMessage({ type: "error", text: "Informe o nome e um email válido para o funcionário." })
      return
    }
    if (!isStrongPassword(newEmployee.password)) {
      setEmployeeFormMessage({ type: "error", text: "A senha inicial precisa ter 8 caracteres, maiúscula, minúscula, número e símbolo." })
      return
    }
    if (!auth.currentUser?.uid) {
      setEmployeeFormMessage({ type: "error", text: "A sessão do proprietário expirou. Entre novamente." })
      return
    }

    setIsCreatingEmployee(true)
    setEmployeeFormMessage({ type: "", text: "" })

    const employeePayload = {
      name: newEmployee.name.trim(),
      email: newEmployee.email.trim().toLowerCase(),
      age: Number(newEmployee.age) || null,
      phone: onlyDigits(newEmployee.phone),
      type: newEmployee.personType,
      document: newEmployee.document.replace(/\D/g, ""),
      employmentType: newEmployee.employmentType,
      position: newEmployee.position.trim() || (newEmployee.role === ACCOUNT_ROLES.COLLABORATOR ? "Colaborador" : "Funcionário de campo"),
      sector: newEmployee.sector.trim() || "Campo",
      droneModel: newEmployee.droneModel,
      role: newEmployee.role,
      ownerId: auth.currentUser?.uid || "",
      teamId: auth.currentUser?.uid || "",
      status: "offline",
      entry: "--:--",
      exit: "--:--",
      hours: 0,
      delays: 0,
      absences: 0,
      lastActivity: "Cadastro criado pelo administrador",
      inviteStatus: "active",
      authProvider: "password",
      createdAt: new Date().toISOString(),
    }

    const secondaryApp = initializeApp(firebaseConfig, `employee-creation-${Date.now()}`)
    const secondaryAuth = getAuth(secondaryApp)
    let createdAuthUser = null

    try {
      const credential = await createUserWithEmailAndPassword(secondaryAuth, employeePayload.email, newEmployee.password)
      createdAuthUser = credential.user
      await setDoc(doc(db, "employees", credential.user.uid), employeePayload)
      setSelectedId(credential.user.uid)
      setNewEmployee({ name: "", email: "", password: "", age: "", phone: "", personType: "CPF", document: "", employmentType: "CLT", position: "", sector: "", droneModel: "", role: ACCOUNT_ROLES.EMPLOYEE })
      setShowEmployeePassword(false)
      setEmployeeFormMessage({ type: "success", text: "Login criado. O funcionário já pode entrar com o email e a senha definidos." })
      setShowNewEmployee(false)
    } catch (error) {
      console.error("Erro ao cadastrar funcionário:", error)
      if (createdAuthUser) {
        try { await deleteUser(createdAuthUser) } catch {   }
      }
      let message = "Não foi possível criar o login do funcionário."
      if (error.code === "auth/email-already-in-use") message = "Este email já possui uma conta de acesso."
      if (error.code === "auth/invalid-email") message = "Informe um email válido."
      if (error.code === "auth/weak-password") message = "A senha inicial não atende aos requisitos de segurança."
      setEmployeeFormMessage({ type: "error", text: message })
    } finally {
      try { await signOut(secondaryAuth) } catch {   }
      await deleteApp(secondaryApp)
      setIsCreatingEmployee(false)
    }
  }

  const updateDroneModel = async (droneModel) => {
    if (!selected) return
    const previousDroneModel = selected.droneModel

    setEmployees((current) => current.map((employee) => (
      employee.id === selected.id ? { ...employee, droneModel } : employee
    )))

    try {
      await updateDoc(doc(db, "employees", selected.id), {
        droneModel,
        updatedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Erro ao atualizar modelo do drone:", error)
      setEmployees((current) => current.map((employee) => (
        employee.id === selected.id ? { ...employee, droneModel: previousDroneModel } : employee
      )))
    }
  }

  const confirmTaskCompletion = async (task) => {
    if (!task?.id || task.status !== "concluida" || !auth.currentUser?.uid) return
    const now = new Date().toISOString()
    try {
      await updateDoc(doc(db, "activities", task.id), {
        ownerConfirmedAt: now,
        ownerConfirmedBy: auth.currentUser.uid,
        updatedAt: now,
      })
    } catch (error) {
      console.error("Erro ao confirmar conclusão da tarefa:", error)
    }
  }

  const startEmployeeEdit = () => {
    if (!selected) return
    setEmployeeEdit({
      name: selected.name || "",
      age: selected.age || "",
      phone: formatBrazilianPhone(selected.phone),
      personType: selected.personType || "CPF",
      document: formatBrazilianDocument(selected.document, selected.personType || "CPF"),
      employmentType: selected.employmentType || "CLT",
      position: selected.position || "",
      sector: selected.sector || "",
    })
    setEmployeeEditMessage({ type: "", text: "" })
    setIsEditingEmployee(true)
  }

  const cancelEmployeeEdit = () => {
    setIsEditingEmployee(false)
    setEmployeeEditMessage({ type: "", text: "" })
  }

  const saveEmployeeEdit = async () => {
    if (!selected || !auth.currentUser?.uid) return
    if (!employeeEdit.name.trim()) {
      setEmployeeEditMessage({ type: "error", text: "Informe o nome do funcionário." })
      return
    }
    const phoneDigits = onlyDigits(employeeEdit.phone)
    const documentDigits = onlyDigits(employeeEdit.document)
    const expectedDocumentLength = employeeEdit.personType === "PJ" ? 14 : 11
    if (phoneDigits && !isValidBrazilianPhone(phoneDigits)) {
      setEmployeeEditMessage({ type: "error", text: "Informe um telefone brasileiro válido, com DDD." })
      return
    }
    const validDocument = employeeEdit.personType === "PJ" ? isValidCNPJ(documentDigits) : isValidCPF(documentDigits)
    if (documentDigits && (documentDigits.length !== expectedDocumentLength || !validDocument)) {
      setEmployeeEditMessage({ type: "error", text: employeeEdit.personType === "PJ" ? "Informe um CNPJ válido." : "Informe um CPF válido." })
      return
    }

    const payload = {
      name: employeeEdit.name.trim(),
      age: Number(employeeEdit.age) || null,
      phone: phoneDigits,
      type: employeeEdit.personType,
      document: documentDigits,
      employmentType: employeeEdit.employmentType,
      position: employeeEdit.position.trim() || "Funcionário de campo",
      sector: employeeEdit.sector.trim() || "Campo",
      updatedAt: new Date().toISOString(),
    }

    setIsSavingEmployee(true)
    setEmployeeEditMessage({ type: "", text: "" })
    try {
      await updateDoc(doc(db, "employees", selected.id), payload)
      setEmployees((current) => current.map((employee) => (
        employee.id === selected.id
          ? { ...employee, ...payload, personType: payload.type }
          : employee
      )))
      setEmployeeEditMessage({ type: "success", text: "Cadastro do funcionário atualizado com sucesso." })
      setIsEditingEmployee(false)
    } catch (error) {
      console.error("Erro ao editar funcionário:", error)
      setEmployeeEditMessage({ type: "error", text: "Não foi possível salvar as alterações do funcionário." })
    } finally {
      setIsSavingEmployee(false)
    }
  }

  const archiveEmployeeFromDashboard = async () => {
    if (!deleteEmployeeTarget || isDeletingEmployee) return
    setIsDeletingEmployee(true)
    setDeleteEmployeeError("")
    try {
      await updateDoc(doc(db, "employees", deleteEmployeeTarget.id), {
        archived: true,
        accessStatus: "blocked",
        archivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      setEmployees((current) => current.filter((employee) => employee.id !== deleteEmployeeTarget.id))
      setSelectedId("")
      setIsEditingEmployee(false)
      setDeleteEmployeeTarget(null)
      setEmployeeFormMessage({ type: "success", text: "Funcionário removido e acesso bloqueado com sucesso." })
    } catch (error) {
      console.error("Erro ao remover funcionário do painel:", error)
      setDeleteEmployeeError("Não foi possível remover e bloquear o acesso do funcionário.")
    } finally {
      setIsDeletingEmployee(false)
    }
  }

  return (
    <>
      <AppHeader />
      <main className="team-page admin-page" data-system-bar-color="#f7f5f0">
      <section className="team-hero admin-hero">
        <div className="team-hero-copy">
          <span className="team-kicker">Dashboard administrativo</span>
          <h1>Monitoramento da equipe</h1>
          <p>Controle status, tarefas, horários e conclusão de tarefas de cada funcionário.</p>
        </div>
        <aside className="team-hero-command">
          <div className="team-hero-command__status"><i /><span><small>Central operacional</small><strong>Painel do proprietário</strong></span></div>
          <div className="team-hero-command__date"><span className="material-symbols-outlined">calendar_month</span><span><small>Visão de hoje</small><strong>{new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date())}</strong></span></div>
          <button type="button" onClick={() => { setShowNewEmployee(true); setEmployeeFormMessage({ type: "", text: "" }); window.setTimeout(() => newEmployeeFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100) }}>
            <span className="material-symbols-outlined">person_add</span> Criar login de funcionário
          </button>
        </aside>
      </section>

      <section className="team-metrics">
        <article>
          <span className="material-symbols-outlined" aria-hidden="true">groups</span>
          <div><small>Funcionários</small><strong>{isTeamLoading ? "--" : totals.employees}</strong><p>Total na equipe</p></div>
        </article>
        <article>
          <span className="material-symbols-outlined" aria-hidden="true">agriculture</span>
          <div><small>Em operação</small><strong>{isTeamLoading ? "--" : totals.working}</strong><p>No momento</p></div>
        </article>
        <article>
          <span className="material-symbols-outlined" aria-hidden="true">assignment</span>
          <div><small>Tarefas pendentes</small><strong>{isTeamLoading ? "--" : totals.pending}</strong><p>Aguardando execução</p></div>
        </article>
        <article>
          <span className="material-symbols-outlined" aria-hidden="true">monitoring</span>
          <div><small>Taxa média de conclusão</small><strong>{isTeamLoading || totals.productivity === null ? "--" : `${totals.productivity}%`}</strong><p>Com base nas tarefas</p></div>
        </article>
      </section>

      <section className="team-filters">
        <div className="team-filter-heading">
          <span><span className="material-symbols-outlined">tune</span><span><strong>Controle operacional</strong><small>Localize pessoas e acompanhe a rotina</small></span></span>
          <button type="button" onClick={() => setFilters({ employee: "", sector: "todos", status: "todos", date: "" })}>Limpar filtros</button>
        </div>
        <label className="team-filter-field team-filter-search">
          <span className="material-symbols-outlined" aria-hidden="true">search</span>
          <input
            value={filters.employee}
            onChange={(event) => setFilters((current) => ({ ...current, employee: event.target.value }))}
            placeholder="Filtrar funcionário"
          />
        </label>
        <label className="team-filter-field">
          <select value={filters.sector} onChange={(event) => setFilters((current) => ({ ...current, sector: event.target.value }))}>
            {sectors.map((sector) => <option key={sector} value={sector}>{sector === "todos" ? "Todos os setores" : sector}</option>)}
          </select>
        </label>
        <label className="team-filter-field">
          <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="todos">Todos os status</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="team-filter-field">
          <input
            type="date"
            value={filters.date}
            onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))}
          />
        </label>
      </section>

      <section className="admin-grid">
        <div className="team-panel team-roster-panel">
          <div className="team-section-header">
            <h2>Equipe</h2>
            <button className="team-link-btn" onClick={() => { setShowNewEmployee((value) => !value); setEmployeeFormMessage({ type: "", text: "" }) }}>
              <span className="material-symbols-outlined" aria-hidden="true">{showNewEmployee ? "close" : "add"}</span>
              {showNewEmployee ? "Fechar" : "Novo funcionário"}
            </button>
          </div>

          {showNewEmployee && (
            <div className="new-employee-form" ref={newEmployeeFormRef}>
              <div className="employee-form-heading">
                <span className="material-symbols-outlined">person_add</span>
                <span><strong>Criar acesso do funcionário</strong><small>Dados pessoais, vínculo profissional e credenciais em um único cadastro.</small></span>
              </div>
              <input
                ref={newEmployeeNameRef}
                value={newEmployee.name}
                onChange={(event) => setNewEmployee((current) => ({ ...current, name: event.target.value }))}
                placeholder="Nome do funcionário"
              />
              <input
                value={newEmployee.email}
                onChange={(event) => setNewEmployee((current) => ({ ...current, email: event.target.value }))}
                placeholder="Email de acesso"
                type="email"
              />
              <div className="new-employee-password">
                <input
                  value={newEmployee.password}
                  onChange={(event) => setNewEmployee((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Senha inicial segura"
                  type={showEmployeePassword ? "text" : "password"}
                  autoComplete="new-password"
                />
                <button
                  className="new-employee-password__toggle"
                  type="button"
                  onClick={() => setShowEmployeePassword((current) => !current)}
                  aria-label={showEmployeePassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">{showEmployeePassword ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
              <input
                value={newEmployee.age}
                onChange={(event) => setNewEmployee((current) => ({ ...current, age: event.target.value.replace(/\D/g, "").slice(0, 3) }))}
                placeholder="Idade"
                inputMode="numeric"
              />
              <input
                value={newEmployee.phone}
                onChange={(event) => setNewEmployee((current) => ({ ...current, phone: formatBrazilianPhone(event.target.value) }))}
                placeholder="(00) 00000-0000"
                type="tel"
                inputMode="numeric"
                maxLength={15}
              />
              <select value={newEmployee.personType} onChange={(event) => setNewEmployee((current) => ({ ...current, personType: event.target.value, document: "" }))} aria-label="Tipo de pessoa">
                <option value="CPF">Pessoa física (CPF)</option>
                <option value="PJ">Pessoa jurídica (CNPJ)</option>
              </select>
              <input
                value={newEmployee.document}
                onChange={(event) => setNewEmployee((current) => ({ ...current, document: formatBrazilianDocument(event.target.value, current.personType) }))}
                placeholder={newEmployee.personType === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"}
                inputMode="numeric"
                maxLength={newEmployee.personType === "PJ" ? 18 : 14}
              />
              <select value={newEmployee.employmentType} onChange={(event) => setNewEmployee((current) => ({ ...current, employmentType: event.target.value }))} aria-label="Vínculo de trabalho">
                <option value="CLT">Contratação CLT</option>
                <option value="PJ">Prestador PJ</option>
              </select>
              <input
                value={newEmployee.position}
                onChange={(event) => setNewEmployee((current) => ({ ...current, position: event.target.value }))}
                placeholder="Cargo"
              />
              <input
                value={newEmployee.sector}
                onChange={(event) => setNewEmployee((current) => ({ ...current, sector: event.target.value }))}
                placeholder="Setor"
              />
              <select
                value={newEmployee.droneModel}
                onChange={(event) => setNewEmployee((current) => ({ ...current, droneModel: event.target.value }))}
                aria-label="Modelo de drone do funcionário"
              >
                <option value="">Selecionar drone</option>
                {DRONE_MODELS.map((model) => <option key={model} value={model}>{model}</option>)}
              </select>
              <div className="employee-login-note">
                <span className="material-symbols-outlined" aria-hidden="true">lock</span>
                <span><strong>Acesso individual</strong><small>A senha fica protegida no Firebase e não é salva no painel.</small></span>
              </div>
              {employeeFormMessage.text && <p className={`employee-form-message ${employeeFormMessage.type}`}>{employeeFormMessage.text}</p>}
              <button onClick={registerEmployee} disabled={isCreatingEmployee}>
                {isCreatingEmployee ? "Criando login..." : "Criar login do funcionário"}
              </button>
            </div>
          )}

          {!showNewEmployee && employeeFormMessage.text && (
            <p className={`employee-form-message employee-form-message--outside ${employeeFormMessage.type}`}>{employeeFormMessage.text}</p>
          )}

          <div className="employee-table">
            {filteredEmployees.map((employee) => (
              <button
                key={employee.id}
                className={`employee-row ${selected?.id === employee.id ? "active" : ""}`}
                onClick={() => { setSelectedId(employee.id); setDetailTab("summary"); setIsEditingEmployee(false); setEmployeeEditMessage({ type: "", text: "" }); setTaskAssignmentMessage({ type: "", text: "" }) }}
              >
                <span className={`status-dot ${employee.status}`}></span>
                <span className="employee-list-avatar">{getInitials(employee.name)}</span>
                <span className="employee-identity">
                  <strong>{employee.name}</strong>
                  <small>{employee.position} · {employee.sector}</small>
                </span>
                <span className="employee-productivity">
                  {employee.productivity === null ? "--" : `${employee.productivity}%`}
                </span>
                <span className="material-symbols-outlined employee-chevron" aria-hidden="true">chevron_right</span>
              </button>
            ))}
            {filteredEmployees.length === 0 && (
              <div className="team-empty-text">
                <span className="material-symbols-outlined">group_add</span>
                <strong>{isTeamLoading ? "Carregando equipe" : employees.length ? "Nenhum resultado" : "Sua equipe começa aqui"}</strong>
                <p>{isTeamLoading ? "Buscando os dados operacionais..." : employees.length ? "Ajuste ou limpe os filtros para visualizar a equipe." : "Crie o primeiro login de funcionário pelo botão acima."}</p>
              </div>
            )}
          </div>
        </div>

        {selected && (
          <aside className="team-panel employee-detail">
            <div className="detail-header">
              <div className="employee-avatar">{getInitials(selected.name)}</div>
              <div className="detail-identity">
                <h2>{selected.name}</h2>
                <p>{selected.position} · {selected.sector}</p>
                <span className={`detail-status ${selected.status}`}>
                  <i></i>{statusLabels[selected.status] || selected.status}
                </span>
              </div>
            </div>

            <nav className="employee-detail-tabs" aria-label="Seções do funcionário">
              <button type="button" className={detailTab === "summary" ? "active" : ""} onClick={() => setDetailTab("summary")}><span className="material-symbols-outlined">dashboard</span>Resumo</button>
              <button type="button" className={detailTab === "tasks" ? "active" : ""} onClick={() => setDetailTab("tasks")}><span className="material-symbols-outlined">task_alt</span>Tarefas<strong>{selected.tasks?.length || 0}</strong></button>
              <button type="button" className={detailTab === "registry" ? "active" : ""} onClick={() => setDetailTab("registry")}><span className="material-symbols-outlined">badge</span>Cadastro</button>
            </nav>

            {detailTab === "summary" && <div className="detail-stats">
              <article><span className="material-symbols-outlined">schedule</span><div><small>Entrada</small><strong>{selected.entry}</strong></div></article>
              <article><span className="material-symbols-outlined">schedule</span><div><small>Saída</small><strong>{selected.exit}</strong></div></article>
              <article><span className="material-symbols-outlined">avg_time</span><div><small>Horas</small><strong>{selected.hours}h</strong></div></article>
              <article><span className="material-symbols-outlined">calendar_today</span><div><small>Atrasos</small><strong>{selected.delays}</strong></div></article>
              <article><span className="material-symbols-outlined">event_busy</span><div><small>Faltas</small><strong>{selected.absences}</strong></div></article>
              <article><span className="material-symbols-outlined">map</span><div><small>Setor</small><strong>{selected.sector}</strong></div></article>
            </div>}

            {detailTab === "registry" && <div className="employee-record">
              <div className="employee-record__head"><span className="material-symbols-outlined">badge</span><div><small>Cadastro administrado pelo proprietário</small><strong>Dados do vínculo</strong></div>{!isEditingEmployee && <span className="employee-record__actions"><button type="button" className="employee-record__edit" onClick={startEmployeeEdit}><span className="material-symbols-outlined">edit</span>Editar</button><button type="button" className="employee-record__delete" onClick={() => { setDeleteEmployeeTarget(selected); setDeleteEmployeeError("") }}><span className="material-symbols-outlined">person_remove</span>Remover</button></span>}</div>
              {employeeEditMessage.text && <p className={`employee-edit-message ${employeeEditMessage.type}`}>{employeeEditMessage.text}</p>}
              {isEditingEmployee ? (
                <div className="employee-edit-form">
                  <label className="employee-edit-field employee-edit-field--wide"><span>Nome completo</span><input value={employeeEdit.name} onChange={(event) => setEmployeeEdit((current) => ({ ...current, name: event.target.value }))} /></label>
                  <label className="employee-edit-field"><span>Idade</span><input inputMode="numeric" value={employeeEdit.age} onChange={(event) => setEmployeeEdit((current) => ({ ...current, age: event.target.value.replace(/\D/g, "").slice(0, 3) }))} placeholder="Idade" /></label>
                  <label className="employee-edit-field"><span>Telefone</span><input type="tel" inputMode="numeric" maxLength={15} value={employeeEdit.phone} onChange={(event) => setEmployeeEdit((current) => ({ ...current, phone: formatBrazilianPhone(event.target.value) }))} placeholder="(00) 00000-0000" /></label>
                  <label className="employee-edit-field"><span>Tipo de pessoa</span><select value={employeeEdit.personType} onChange={(event) => setEmployeeEdit((current) => ({ ...current, personType: event.target.value, document: "" }))}><option value="CPF">Pessoa física</option><option value="PJ">Pessoa jurídica</option></select></label>
                  <label className="employee-edit-field"><span>Documento</span><input inputMode="numeric" maxLength={employeeEdit.personType === "PJ" ? 18 : 14} value={employeeEdit.document} onChange={(event) => setEmployeeEdit((current) => ({ ...current, document: formatBrazilianDocument(event.target.value, current.personType) }))} placeholder={employeeEdit.personType === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"} /></label>
                  <label className="employee-edit-field"><span>Vínculo</span><select value={employeeEdit.employmentType} onChange={(event) => setEmployeeEdit((current) => ({ ...current, employmentType: event.target.value }))}><option value="CLT">Contratação CLT</option><option value="PJ">Prestador PJ</option></select></label>
                  <label className="employee-edit-field"><span>Cargo</span><input value={employeeEdit.position} onChange={(event) => setEmployeeEdit((current) => ({ ...current, position: event.target.value }))} placeholder="Funcionário de campo" /></label>
                  <label className="employee-edit-field"><span>Setor</span><input value={employeeEdit.sector} onChange={(event) => setEmployeeEdit((current) => ({ ...current, sector: event.target.value }))} placeholder="Campo" /></label>
                  <div className="employee-edit-actions"><button type="button" className="employee-edit-cancel" onClick={cancelEmployeeEdit} disabled={isSavingEmployee}>Cancelar</button><button type="button" className="employee-edit-save" onClick={saveEmployeeEdit} disabled={isSavingEmployee}><span className="material-symbols-outlined">save</span>{isSavingEmployee ? "Salvando..." : "Salvar alterações"}</button></div>
                </div>
              ) : (
                <div className="employee-record__grid">
                  <span><small>Vínculo</small><strong>{selected.employmentType === "PJ" ? "Prestador PJ" : "Contratação CLT"}</strong></span>
                  <span><small>Tipo de pessoa</small><strong>{selected.personType === "PJ" ? "Pessoa jurídica" : "Pessoa física"}</strong></span>
                  <span><small>Documento</small><strong>{selected.document ? formatBrazilianDocument(selected.document, selected.personType) : "Não informado"}</strong></span>
                  <span><small>Telefone</small><strong>{selected.phone ? formatBrazilianPhone(selected.phone) : "Não informado"}</strong></span>
                  <span><small>Idade</small><strong>{selected.age ? `${selected.age} anos` : "Não informada"}</strong></span>
                  <span><small>Email</small><strong>{selected.email || "Não informado"}</strong></span>
                </div>
              )}
            </div>}

            {detailTab === "summary" && <div className="last-activity">
              <span className="material-symbols-outlined" aria-hidden="true">deployed_code_history</span>
              <div><small>Última atividade</small><strong>{selected.lastActivity}</strong></div>
            </div>}

            {detailTab === "summary" && <div className="detail-performance-grid">
              <article className="productivity-card">
                <small>Taxa de conclusão de tarefas</small>
                <strong>{selected.productivity === null ? "--" : `${selected.productivity}%`}</strong>
                <p>{selected.productivity === null ? "Sem tarefas registradas" : "Tarefas concluídas no período"}</p>
                <div className="productivity-bars">
                  {[
                    ["Dia", selected.daily],
                    ["Semana", selected.weekly],
                    ["Mês", selected.monthly],
                  ].map(([label, value]) => (
                    <div key={label} title={value === null ? `${label}: sem dados` : `${label}: ${value}%`}>
                      <i style={{ height: value === null ? "0" : `${value}%` }}></i>
                    </div>
                  ))}
                </div>
              </article>
              <article className="drone-operation-card">
                <DroneIcon />
                <div>
                  <small>Drone utilizado</small>
                  <select
                    ref={droneSelectRef}
                    value={selected.droneModel}
                    onChange={(event) => updateDroneModel(event.target.value)}
                    aria-label={`Selecionar drone de ${selected.name}`}
                  >
                    <option value="">Selecionar modelo</option>
                    {selected.droneModel && !DRONE_MODELS.includes(selected.droneModel) && (
                      <option value={selected.droneModel}>{selected.droneModel}</option>
                    )}
                    {DRONE_MODELS.map((model) => <option key={model} value={model}>{model}</option>)}
                  </select>
                  <p>{selected.droneModel ? "Modelo salvo" : "Nenhum drone selecionado"}</p>
                </div>
              </article>
            </div>}

            {detailTab === "tasks" && <div className="assign-task" id="nova-tarefa" ref={assignTaskRef}>
              <div className="assign-task__header">
                <span className="material-symbols-outlined">assignment_add</span>
                <div><small>NOVA ATIVIDADE</small><h3>Atribuir tarefa para {selected.name}</h3><p>Defina a orientação, prioridade e prazo que aparecerão para o funcionário.</p></div>
              </div>

              <div className="assign-task__grid">
                <label className="assign-task__field assign-task__field--title">
                  <span>Título da tarefa</span>
                  <input
                    ref={taskInputRef}
                    value={taskDraft.title}
                    onChange={(event) => { setTaskDraft((current) => ({ ...current, title: event.target.value })); if (taskAssignmentMessage.text) setTaskAssignmentMessage({ type: "", text: "" }) }}
                    placeholder="Ex.: Verificar o talhão Norte"
                    disabled={isAssigningTask}
                    maxLength={100}
                  />
                </label>

                <label className="assign-task__field assign-task__field--description">
                  <span>Descrição e orientações</span>
                  <textarea
                    value={taskDraft.description}
                    onChange={(event) => setTaskDraft((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Explique o que deve ser feito, onde e quais cuidados são necessários."
                    disabled={isAssigningTask}
                    rows={4}
                    maxLength={600}
                  />
                </label>

                <label className="assign-task__field">
                  <span>Tipo</span>
                  <select value={taskDraft.type} onChange={(event) => setTaskDraft((current) => ({ ...current, type: event.target.value }))} disabled={isAssigningTask}>
                    <option value="tarefa">Tarefa</option>
                    <option value="voo">Voo de drone</option>
                    <option value="irrigacao">Irrigação</option>
                    <option value="pulverizacao">Pulverização</option>
                    <option value="colheita">Colheita</option>
                    <option value="manutencao">Manutenção</option>
                  </select>
                </label>

                <label className="assign-task__field">
                  <span>Prioridade</span>
                  <select value={taskDraft.priority} onChange={(event) => setTaskDraft((current) => ({ ...current, priority: event.target.value }))} disabled={isAssigningTask}>
                    <option value="alta">Alta</option>
                    <option value="media">Média</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </label>

                <label className="assign-task__field">
                  <span>Data</span>
                  <input type="date" value={taskDraft.date} onChange={(event) => setTaskDraft((current) => ({ ...current, date: event.target.value }))} disabled={isAssigningTask} />
                </label>

                <label className="assign-task__field">
                  <span>Horário</span>
                  <input type="time" value={taskDraft.time} onChange={(event) => setTaskDraft((current) => ({ ...current, time: event.target.value }))} disabled={isAssigningTask} />
                </label>
              </div>

              <div className="assign-task__footer">
                <span><span className="material-symbols-outlined">person</span>Será enviada somente para <strong>{selected.name}</strong></span>
                <button type="button" onClick={assignTask} disabled={isAssigningTask}><span className="material-symbols-outlined">send</span>{isAssigningTask ? "Atribuindo..." : "Atribuir tarefa"}</button>
              </div>
              {taskAssignmentMessage.text && <p className={`task-assignment-message ${taskAssignmentMessage.type}`} role="status">{taskAssignmentMessage.text}</p>}
            </div>}

            {detailTab === "tasks" && <section className="owner-task-board">
              <div className="owner-task-board__header">
                <div><span className="material-symbols-outlined">fact_check</span><span><small>ATUALIZAÇÃO EM TEMPO REAL</small><h3>Acompanhamento de tarefas</h3></span></div>
                <strong>{selected.tasks?.length || 0} no total</strong>
              </div>
              <div className="owner-task-board__summary">
                <article className="pending"><span className="material-symbols-outlined">pending_actions</span><span><small>Pendentes</small><strong>{selected.pending}</strong></span></article>
                <article className="progress"><span className="material-symbols-outlined">play_circle</span><span><small>Em andamento</small><strong>{selected.active}</strong></span></article>
                <article className="done"><span className="material-symbols-outlined">task_alt</span><span><small>Concluídas</small><strong>{selected.done}</strong></span></article>
              </div>
              <div className="owner-task-board__list">
                {selected.tasks?.length ? [...selected.tasks]
                  .sort((a, b) => String(b.completedAt || b.updatedAt || b.createdAt || "").localeCompare(String(a.completedAt || a.updatedAt || a.createdAt || "")))
                  .map((task) => {
                    const status = taskStatusMeta[task.status] || taskStatusMeta.pendente
                    return (
                      <article className={`owner-task-item ${task.status || "pendente"}`} key={`activities:${task.id}`}>
                        <span className="material-symbols-outlined owner-task-item__icon">{status.icon}</span>
                        <div className="owner-task-item__content">
                          <div><strong>{task.title || "Tarefa sem título"}</strong><span className={`owner-task-item__status ${task.status || "pendente"}`}>{status.label}</span></div>
                          {task.description && <p className="owner-task-item__description">{task.description}</p>}
                          <p className="owner-task-item__history">{task.status === "concluida" && task.completedAt ? `Concluída em ${formatTaskDate(task.completedAt)}` : (task.status === "andamento" || task.status === "em_andamento") && task.startedAt ? `Iniciada em ${formatTaskDate(task.startedAt)}` : `Atribuída em ${formatTaskDate(task.createdAt) || "data não informada"}`}</p>
                          <div className="owner-task-item__meta"><span>{task.type || "tarefa"}</span><span className={task.priority || "media"}>Prioridade {task.priority || "média"}</span>{task.time && <span>{task.time}</span>}</div>
                        </div>
                        <span className="owner-task-item__due"><small>Prazo</small><strong>{task.due || "Sem prazo"}</strong></span>
                        {isAwaitingOwnerConfirmation(task) && <button type="button" className="owner-task-item__confirm" onClick={() => confirmTaskCompletion(task)}><span className="material-symbols-outlined">verified</span>Confirmar finalização</button>}
                      </article>
                    )
                  }) : <div className="owner-task-board__empty"><span className="material-symbols-outlined">assignment_add</span><div><strong>Nenhuma tarefa atribuída</strong><p>Use o campo acima para enviar a primeira tarefa a este funcionário.</p></div></div>}
              </div>
            </section>}

          </aside>
        )}
        {!selected && !isTeamLoading && (
          <aside className="team-panel team-selection-empty">
            <span className="material-symbols-outlined">manage_accounts</span>
            <div><small>PAINEL DE DETALHES</small><h2>Selecione um funcionário</h2><p>Os horários, taxa de conclusão, drone e tarefas aparecerão aqui.</p></div>
          </aside>
        )}
      </section>

      {deleteEmployeeTarget && (
        <div className="employee-delete-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isDeletingEmployee) setDeleteEmployeeTarget(null) }}>
          <section className="employee-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="employee-delete-title">
            <div className="employee-delete-dialog__icon"><span className="material-symbols-outlined">person_remove</span></div>
            <div className="employee-delete-dialog__copy"><small>REMOVER FUNCIONÁRIO</small><h2 id="employee-delete-title">Remover {deleteEmployeeTarget.name}?</h2></div>
            {deleteEmployeeError && <p className="employee-delete-dialog__error"><span className="material-symbols-outlined">error</span>{deleteEmployeeError}</p>}
            <div className="employee-delete-dialog__actions"><button type="button" className="employee-delete-dialog__cancel" onClick={() => setDeleteEmployeeTarget(null)} disabled={isDeletingEmployee}>Manter funcionário</button><button type="button" className="employee-delete-dialog__confirm" onClick={archiveEmployeeFromDashboard} disabled={isDeletingEmployee}><span className="material-symbols-outlined">person_remove</span>{isDeletingEmployee ? "Removendo..." : "Remover da equipe"}</button></div>
          </section>
        </div>
      )}

      </main>
      <AppFooter />
      <MenuBar />
    </>
  )
}
