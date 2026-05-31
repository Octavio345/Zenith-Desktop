import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db } from "../../services/firebase"
import { addDoc, collection, query, where, getDocs } from "firebase/firestore"
import "../../styles/App/CadastrarFazenda.css"

export default function CadastrarFazenda() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: "", tipo_proprietario: "", data_aquisicao: "", cep: "",
    bairro: "", municipio: "", uf: "", area_total: "", telefone: "", plantacao: ""
  })

  const buscarCEP = async (cep) => {
    const cepLimpo = cep.replace(/\D/g, "")
    if (cepLimpo.length !== 8) return
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setFormData((p) => ({ ...p, bairro: data.bairro || "", municipio: data.localidade || "", uf: data.uf || "" }))
      }
    } catch (e) { console.error(e) }
  }

  function handleChange(e) {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  async function handleRegister(e) {
    e.preventDefault()
    const user = auth.currentUser
    if (!user) { alert("Usuário não autenticado"); return }
    try {
      setLoading(true)
      const q = query(collection(db, "farms"), where("ownerId", "==", user.uid))
      const snapshot = await getDocs(q)
      if (!snapshot.empty) {
        alert("Você já possui uma fazenda cadastrada.")
        navigate("/home"); return
      }
      await addDoc(collection(db, "farms"), { ...formData, ownerId: user.uid, createdAt: new Date() })
      alert("Fazenda cadastrada com sucesso!")
      navigate("/home")
    } catch (error) {
      console.error(error)
      alert("Erro ao cadastrar fazenda")
    } finally { setLoading(false) }
  }

  return (
    <div className="ff-shell">
      <div className="ff-bg-grid" />
      <div className="ff-bg-sphere ff-bg-sphere-1" />
      <div className="ff-bg-sphere ff-bg-sphere-2" />

      <header className="ff-header">
        <button className="ff-back" onClick={() => navigate("/home")}>← Voltar</button>
        <div className="ff-header-title">
          <span className="ff-mono">// FARMS / NEW</span>
          <h1>Cadastrar fazenda</h1>
        </div>
        <div className="ff-header-status">
          <span className="ff-pulse" /> Sessão ativa
        </div>
      </header>

      <div className="ff-grid">
        <aside className="ff-side">
          <div className="ff-side-block">
            <span className="ff-mono">// OPERATION_INTEL</span>
            <h2>Estruture sua propriedade dentro da plataforma.</h2>
            <p>Os dados informados alimentam módulos de telemetria, previsão climática e gestão de safra.</p>
          </div>
          <ul className="ff-side-list">
            <li><span /> Geolocalização automática via CEP</li>
            <li><span /> Integração com módulos de safra</li>
            <li><span /> Dados criptografados ponta a ponta</li>
          </ul>
          <div className="ff-side-stats">
            <div><strong>10k+</strong><span>fazendas conectadas</span></div>
            <div><strong>27</strong><span>estados atendidos</span></div>
          </div>
        </aside>

        <form className="ff-card" onSubmit={handleRegister}>
          <div className="ff-card-head">
            <h2>Dados da propriedade</h2>
            <p>Preencha as informações abaixo para registrar sua fazenda.</p>
          </div>

          <div className="ff-form">
            <div className="ff-field full">
              <label>Nome da fazenda</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="Ex: Fazenda Boa Vista"/>
            </div>

            <div className="ff-field">
              <label>Tipo de proprietário</label>
              <select name="tipo_proprietario" value={formData.tipo_proprietario} onChange={handleChange} required>
                <option value="">Selecione</option>
                <option value="PF">Pessoa Física</option>
                <option value="PJ">Pessoa Jurídica</option>
              </select>
            </div>

            <div className="ff-field">
              <label>Data de aquisição</label>
              <input type="date" name="data_aquisicao" value={formData.data_aquisicao} onChange={handleChange} required/>
            </div>

            <div className="ff-field">
              <label>CEP</label>
              <input type="text" name="cep" value={formData.cep}
                onChange={(e) => { handleChange(e); buscarCEP(e.target.value) }} required placeholder="00000-000"/>
            </div>

            <div className="ff-field">
              <label>UF</label>
              <input type="text" name="uf" maxLength="2" value={formData.uf} onChange={handleChange} required placeholder="SP"/>
            </div>

            <div className="ff-field">
              <label>Bairro</label>
              <input type="text" name="bairro" value={formData.bairro} onChange={handleChange} required/>
            </div>

            <div className="ff-field">
              <label>Município</label>
              <input type="text" name="municipio" value={formData.municipio} onChange={handleChange} required/>
            </div>

            <div className="ff-field">
              <label>Área total (hectares)</label>
              <input type="number" name="area_total" value={formData.area_total} onChange={handleChange} required placeholder="Ex: 120"/>
            </div>

            <div className="ff-field">
              <label>Telefone do proprietário</label>
              <input type="text" name="telefone" value={formData.telefone} onChange={handleChange} required placeholder="(00) 00000-0000"/>
            </div>

            <div className="ff-field full">
              <label>Principal plantação</label>
              <select name="plantacao" value={formData.plantacao} onChange={handleChange} required>
                <option value="">Selecione</option>
                <option value="Soja">Soja</option>
                <option value="Tomate">Tomate</option>
                <option value="Café">Café</option>
              </select>
            </div>

            <button type="submit" className="ff-btn primary" disabled={loading}>
              {loading ? <><span className="ff-spinner"/> Cadastrando...</> : "Cadastrar fazenda →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
