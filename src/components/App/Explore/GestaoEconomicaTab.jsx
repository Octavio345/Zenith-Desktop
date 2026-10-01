import { useEffect, useMemo, useRef, useState } from "react"
import { calculateEstimate, calculateProjection, COST_CATEGORIES, parseBrazilianNumber, readEstimates, readMappedAreas, writeEstimates } from "../../../services/economicEstimates"
import "../../../styles/App/GestaoEconomicaTab.css"

const currency = (cents) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)
const areaFormat = (area) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 }).format(area)
const decimalFormat = (value) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value)
const moneyFormat = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatSavedMoney = (value) => {
  if (value === "" || value == null) return ""
  const amount = parseBrazilianNumber(value)
  return Number.isFinite(amount) && amount >= 0 ? moneyFormat.format(amount) : ""
}
const formatTypedMoney = (value) => {
  const digits = value.replace(/\D/g, "").replace(/^0+(?=\d)/, "")
  if (!digits) return value ? "0,00" : ""
  if (digits.length > 11) return null
  return moneyFormat.format(Number(digits) / 100)
}
const formattedExampleCosts = Object.fromEntries(Object.entries({ seeds: "850", fertilizers: "1400", pesticides: "1100", machinery: "900", fuel: "300", labor: "150", other: "200" }).map(([key, value]) => [key, formatSavedMoney(value)]))
const emptyCosts = () => Object.fromEntries(COST_CATEGORIES.map(({ key }) => [key, ""]))
const newDraft = () => ({ id: null, name: "", areaId: "", areaInput: "", costs: emptyCosts(), yieldScHa: "", pricePerSack: "" })

function CurrencyInput({ value, onValueChange, label }) {
  const inputRef = useRef(null)

  const handleChange = (event) => {
    const raw = event.target.value
    const atEnd = event.target.selectionStart === raw.length
    const digitsBeforeCaret = raw.slice(0, event.target.selectionStart ?? raw.length).replace(/\D/g, "").length
    const formatted = formatTypedMoney(raw)
    if (formatted === null) return
    const deleting = event.nativeEvent?.inputType?.startsWith("delete")
    onValueChange(deleting && formatted === "0,00" ? "" : formatted)
    requestAnimationFrame(() => {
      const input = inputRef.current
      if (!input || document.activeElement !== input) return
      let position = formatted.length
      if (!atEnd) {
        let seen = 0
        position = 0
        while (position < formatted.length && seen < digitsBeforeCaret) {
          if (/\d/.test(formatted[position])) seen += 1
          position += 1
        }
      }
      input.setSelectionRange(position, position)
    })
  }

  const handlePaste = (event) => {
    const pasted = event.clipboardData.getData("text").trim().replace(/^R\$\s*/i, "")
    const amount = /[.,]/.test(pasted) ? formatSavedMoney(pasted) : formatTypedMoney(pasted)
    if (amount === null || amount === "") return
    event.preventDefault()
    onValueChange(amount)
  }

  return <input ref={inputRef} className="economia-money-input" inputMode="numeric" autoComplete="off" spellCheck={false} value={value} onChange={handleChange} onPaste={handlePaste} placeholder="0,00" aria-label={label} />
}

export default function GestaoEconomicaTab() {
  const [areas, setAreas] = useState(readMappedAreas)
  const [estimates, setEstimates] = useState(readEstimates)
  const [draft, setDraft] = useState(newDraft)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [deleteId, setDeleteId] = useState(null)

  const mappedArea = areas.find((area) => String(area.id) === String(draft.areaId))
  const areaHa = mappedArea ? Number(mappedArea.areaHa) : parseBrazilianNumber(draft.areaInput)
  const calculation = useMemo(() => calculateEstimate(draft.costs, areaHa), [draft.costs, areaHa])
  const projection = useMemo(() => calculateProjection(draft.costs, areaHa, draft.yieldScHa, draft.pricePerSack), [draft.costs, areaHa, draft.yieldScHa, draft.pricePerSack])
  const hasProjectionInput = Boolean(String(draft.yieldScHa).trim() || String(draft.pricePerSack).trim())
  const hasCosts = calculation.rows.some((row) => row.cents > 0)
  const largest = Math.max(1, ...calculation.rows.map((row) => Number.isFinite(row.cents) ? row.cents : 0))

  useEffect(() => {
    const refreshAreas = () => setAreas(readMappedAreas())
    const onStorage = (event) => { if (event.key === "farmPolygons") refreshAreas() }
    window.addEventListener("zenith:farm-areas-updated", refreshAreas)
    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener("zenith:farm-areas-updated", refreshAreas)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  const updateDraft = (patch) => { setDraft((current) => ({ ...current, ...patch })); setMessage(""); setError("") }
  const updateCost = (key, value) => updateDraft({ costs: { ...draft.costs, [key]: value } })

  const openEstimate = (estimate) => {
    setDraft({
      id: estimate.id,
      name: estimate.name || "",
      areaId: estimate.areaId || "",
      areaInput: String(estimate.areaHa ?? "").replace(".", ","),
      costs: Object.fromEntries(COST_CATEGORIES.map(({ key }) => [key, formatSavedMoney(estimate.costs?.[key])])),
      yieldScHa: String(estimate.yieldScHa ?? "").replace(".", ","),
      pricePerSack: formatSavedMoney(estimate.pricePerSack),
    })
    setMessage("")
    setError("")
  }

  const selectMappedArea = (area) => {
    const existing = estimates.find((item) => String(item.areaId) === String(area.id))
    if (existing) { openEstimate(existing); return }
    setDraft({ ...newDraft(), name: area.name, areaId: String(area.id), areaInput: String(area.areaHa).replace(".", ",") })
    setMessage("")
    setError("")
  }

  const save = () => {
    const name = mappedArea ? mappedArea.name : draft.name.trim()
    if (!name) { setError("Informe o nome do talhão."); return }
    if (!Number.isFinite(areaHa) || areaHa <= 0 || areaHa > 10000000) { setError("Informe uma área válida entre 0 e 10 milhões de hectares."); return }
    if (!calculation.valid) { setError("Revise os custos. Use valores positivos dentro do limite aceito."); return }
    if (!hasCosts) { setError("Informe ao menos um custo por hectare."); return }
    if (hasProjectionInput && !projection.valid) { setError("Para projetar o resultado, informe produtividade (sc/ha) e preço da saca (R$) válidos."); return }
    const now = new Date().toISOString()
    const record = {
      id: draft.id || crypto.randomUUID(),
      name,
      areaId: mappedArea ? String(mappedArea.id) : "",
      areaHa,
      costs: Object.fromEntries(calculation.rows.map((row) => [row.key, (row.cents / 100).toFixed(2)])),
      yieldScHa: projection.valid ? parseBrazilianNumber(draft.yieldScHa) : null,
      pricePerSack: projection.valid ? parseBrazilianNumber(draft.pricePerSack) : null,
      updatedAt: now,
    }
    const next = draft.id
      ? estimates.map((item) => item.id === draft.id ? record : item)
      : [record, ...estimates]
    try {
      writeEstimates(next)
      setEstimates(next)
      setDraft({ ...draft, id: record.id, name, areaInput: String(areaHa).replace(".", ",") })
      setError("")
      setMessage("Estimativa salva neste navegador.")
    } catch {
      setError("Não foi possível salvar neste navegador. Verifique o espaço disponível.")
    }
  }

  const remove = () => {
    const next = estimates.filter((item) => item.id !== deleteId)
    try {
      writeEstimates(next)
      setEstimates(next)
      if (draft.id === deleteId) setDraft(newDraft())
      setDeleteId(null)
      setMessage("Estimativa excluída.")
      setError("")
    } catch {
      setError("Não foi possível excluir a estimativa.")
      setDeleteId(null)
    }
  }

  return (
    <main className="economia">
      <header className="economia-intro">
        <div>
          <span className="economia-eyebrow">PLANEJAMENTO DO TALHÃO</span>
          <h2>Gestão econômica</h2>
          <p>Compare o investimento com a receita esperada da soja usando seus custos, produtividade e preço da saca.</p>
        </div>
        <span className="economia-intro-mark" aria-hidden="true">R$/ha</span>
      </header>

      <div className="economia-layout">
        <aside className="economia-sidebar" aria-label="Talhões e estimativas">
          <div className="economia-sidebar-heading"><div><span className="economia-eyebrow">MAPEAMENTO</span><h3>Talhões do Mapa</h3></div></div>
          {areas.length ? <div className="economia-saved-list">
            {areas.map((area) => {
              const linked = estimates.some((item) => String(item.areaId) === String(area.id))
              return <button key={area.id} type="button" className={`economia-saved ${String(draft.areaId) === String(area.id) ? "is-active" : ""}`} onClick={() => selectMappedArea(area)}>
                <span className="economia-saved-name">{area.name}</span>
                <span className="economia-saved-meta">{areaFormat(Number(area.areaHa))} ha <span aria-hidden="true">·</span> {linked ? "Estimativa vinculada" : "Sem estimativa"}</span>
              </button>
            })}
          </div> : <p className="economia-sidebar-empty">Salve um talhão no Mapa para encontrá-lo aqui automaticamente.</p>}
          <div className="economia-sidebar-divider" />
          <div className="economia-sidebar-heading">
            <div><span className="economia-eyebrow">PLANEJAMENTO</span><h3>Estimativas</h3></div>
            <button type="button" className="economia-icon-button" onClick={() => { setDraft(newDraft()); setMessage(""); setError("") }} aria-label="Nova estimativa" title="Nova estimativa">
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
          {estimates.length ? (
            <div className="economia-saved-list">
              {estimates.map((item) => {
                const currentArea = areas.find((area) => String(area.id) === String(item.areaId))
                const savedArea = currentArea ? Number(currentArea.areaHa) : Number(item.areaHa)
                const summary = calculateEstimate(item.costs || {}, savedArea)
                return <button key={item.id} type="button" className={`economia-saved ${draft.id === item.id ? "is-active" : ""}`} onClick={() => openEstimate(item)}>
                  <span className="economia-saved-name">{currentArea?.name || item.name}</span>
                  <span className="economia-saved-meta">{areaFormat(savedArea)} ha <span aria-hidden="true">·</span> {currency(summary.totalCents)}</span>
                </button>
              })}
            </div>
          ) : <p className="economia-sidebar-empty">Nenhuma estimativa salva. Comece preenchendo os dados do talhão.</p>}
          <p className="economia-local-note"><span className="material-symbols-outlined" aria-hidden="true">info</span>Os custos e projeções ficam salvos apenas neste navegador.</p>
        </aside>

        <div className="economia-main">
          <section className="economia-panel" aria-labelledby="economia-form-title">
            <div className="economia-panel-heading">
              <div><span className="economia-eyebrow">01 / TALHÃO</span><h3 id="economia-form-title">{draft.id ? "Editar estimativa" : "Nova estimativa"}</h3></div>
              <button type="button" className="economia-text-button" onClick={() => { setDraft({ ...newDraft(), name: "Talhão exemplo", areaInput: "50", costs: { ...formattedExampleCosts } }); setMessage(""); setError("") }}>Preencher exemplo de 50 ha</button>
            </div>
            <div className="economia-field-grid">
              <label className="economia-field"><span>Nome do talhão</span><input value={mappedArea?.name || draft.name} onChange={(event) => updateDraft({ name: event.target.value })} placeholder="Ex.: Talhão Norte" maxLength={80} readOnly={Boolean(mappedArea)} /></label>
              <label className="economia-field"><span>Área demarcada no Mapa</span><select value={mappedArea ? String(mappedArea.id) : ""} onChange={(event) => { const area = areas.find((item) => String(item.id) === event.target.value); if (area) selectMappedArea(area); else updateDraft({ areaId: "", areaInput: String(areaHa || "").replace(".", ",") }) }}><option value="">Informar área manualmente</option>{areas.map((area) => <option key={area.id} value={String(area.id)}>{area.name} · {areaFormat(Number(area.areaHa))} ha</option>)}</select></label>
              <label className="economia-field"><span>Área do talhão (ha)</span><input inputMode="decimal" value={mappedArea ? areaFormat(Number(mappedArea.areaHa)) : draft.areaInput} onChange={(event) => updateDraft({ areaInput: event.target.value })} placeholder="Ex.: 50" readOnly={Boolean(mappedArea)} aria-describedby="economia-area-help" /></label>
              <p id="economia-area-help" className="economia-area-help">{mappedArea ? "Nome e área vêm do Mapa. Alterações na demarcação atualizam esta estimativa." : draft.areaId ? "Talhão vinculado não encontrado no Mapa. A área salva foi mantida; escolha outro talhão ou use a área manual." : "Você também pode cadastrar sem demarcar o talhão no Mapa."}</p>
            </div>
          </section>

          <section className="economia-panel" aria-labelledby="economia-cost-title">
            <div className="economia-panel-heading"><div><span className="economia-eyebrow">02 / COMPOSIÇÃO</span><h3 id="economia-cost-title">Custos por hectare</h3></div><span className="economia-unit">R$ / ha</span></div>
            <p className="economia-money-hint">Digite os números; os dois últimos dígitos representam os centavos. Evite repetir combustível e mão de obra se já estiverem incluídos nas operações mecanizadas.</p>
            <div className="economia-cost-grid">
              {COST_CATEGORIES.map(({ key, label }, index) => <label className="economia-cost-field" key={key}><span className="economia-cost-index">{String(index + 1).padStart(2, "0")}</span><span>{label}</span><span className="economia-input-wrap"><small aria-hidden="true">R$</small><CurrencyInput value={draft.costs[key]} onValueChange={(value) => updateCost(key, value)} label={`${label} em reais por hectare`} /></span></label>)}
            </div>
          </section>

          <section className="economia-panel" aria-labelledby="economia-projection-title">
            <div className="economia-panel-heading"><div><span className="economia-eyebrow">03 / PROJEÇÃO DE VENDA</span><h3 id="economia-projection-title">Preço e produtividade</h3></div><span className="economia-unit">OPCIONAL</span></div>
            <p className="economia-panel-description">Informe a produtividade esperada e o preço de venda da saca de soja de 60 kg. O preço varia por região e momento de comercialização.</p>
            <div className="economia-field-grid">
              <label className="economia-field"><span>Produtividade esperada (sc/ha)</span><input inputMode="decimal" value={draft.yieldScHa} onChange={(event) => updateDraft({ yieldScHa: event.target.value })} placeholder="Ex.: 60" /></label>
              <label className="economia-field"><span>Preço estimado da saca (R$ / sc)</span><span className="economia-input-wrap economia-input-wrap--price"><small aria-hidden="true">R$</small><CurrencyInput value={draft.pricePerSack} onValueChange={(value) => updateDraft({ pricePerSack: value })} label="Preço estimado da saca em reais" /></span></label>
            </div>
            {hasProjectionInput && !projection.valid && <p className="economia-projection-hint">Preencha os dois valores com números maiores que zero e informe a área para visualizar a projeção.</p>}
            {error && <p className="economia-feedback is-error" role="alert">{error}</p>}
            {message && <p className="economia-feedback is-success" role="status">{message}</p>}
            <div className="economia-actions"><button className="economia-save" type="button" onClick={save}>{draft.id ? "Salvar alterações" : "Salvar estimativa"}</button>{draft.id && <button className="economia-delete" type="button" onClick={() => setDeleteId(draft.id)}>Excluir estimativa</button>}</div>
          </section>

          <section className="economia-results" aria-label="Resumo dos custos">
            <div className="economia-metric"><span>CUSTO POR HECTARE</span><strong>{currency(calculation.perHaCents)}</strong><small>Soma das categorias informadas</small></div>
            <div className="economia-metric economia-metric-primary"><span>INVESTIMENTO NO TALHÃO</span><strong>{currency(calculation.totalCents)}</strong><small>{Number.isFinite(areaHa) && areaHa > 0 ? `${areaFormat(areaHa)} ha × ${currency(calculation.perHaCents)}/ha` : "Informe a área para calcular"}</small></div>
          </section>

          {hasCosts && projection.valid && <section className="economia-projection-results" aria-label="Projeção econômica">
            <div className="economia-projection-heading"><span className="economia-eyebrow">RESULTADO PROJETADO</span><p>Receita estimada = produtividade × preço da saca × área</p></div>
            <div className="economia-projection-grid">
              <div className="economia-projection-item"><span>Receita bruta</span><strong>{currency(projection.revenueCents)}</strong><small>{currency(projection.revenuePerHaCents)}/ha</small></div>
              <div className={`economia-projection-item ${projection.resultCents < 0 ? "is-negative" : "is-positive"}`}><span>{projection.resultCents < 0 ? "Prejuízo estimado" : "Resultado estimado"}</span><strong>{currency(projection.resultCents)}</strong><small>{currency(projection.resultPerHaCents)}/ha · resultado/receita {decimalFormat(projection.marginPercent)}%</small></div>
            </div>
            <p>Para cobrir os custos informados: <strong>{decimalFormat(projection.breakEvenScHa)} sc/ha</strong> ao preço indicado, ou <strong>{currency(projection.breakEvenPriceCents)}/sc</strong> com a produtividade indicada.</p>
          </section>}

          {hasCosts && calculation.valid && <section className="economia-panel economia-breakdown" aria-labelledby="economia-breakdown-title"><div className="economia-panel-heading"><div><span className="economia-eyebrow">04 / ANÁLISE</span><h3 id="economia-breakdown-title">Composição do custo</h3></div></div><div className="economia-bars">{calculation.rows.filter((row) => row.cents > 0).sort((a, b) => b.cents - a.cents).map((row) => <div className="economia-bar-row" key={row.key}><span>{row.label}<small>{Math.round(row.cents / calculation.perHaCents * 100)}% do custo</small></span><div className="economia-bar-track"><div style={{ width: `${(row.cents / largest) * 100}%` }} /></div><strong>{currency(Math.round(row.cents * areaHa))}<small>{currency(row.cents)}/ha</small></strong></div>)}</div></section>}
          <p className="economia-disclaimer">Projeção baseada nos dados informados. O resultado não é lucro líquido contábil: custos não cadastrados, frete, tributos, perdas e variações de preço podem alterar o valor final.</p>
        </div>
      </div>

      {deleteId && <div className="economia-dialog-backdrop"><div className="economia-dialog" role="alertdialog" aria-modal="true" aria-labelledby="economia-delete-title"><h3 id="economia-delete-title">Excluir estimativa?</h3><p>Essa ação remove os custos salvos para este talhão neste navegador.</p><div><button type="button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="economia-dialog-danger" onClick={remove}>Excluir</button></div></div></div>}
    </main>
  )
}
