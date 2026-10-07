import { useEffect, useMemo, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { useFarm } from "./hooks/useFarm"
import { calculateSoybeanYield, calculateWheatYield, parseYieldNumber, YIELD_CROPS, yieldFormat } from "../../../services/yieldEstimation"
import { readMappedPlots, readYieldEstimates, saveYieldEstimate } from "../../../services/yieldEstimationRepository"
import "../../../styles/App/GestaoEconomicaTab.css"
import "../../../styles/App/ProdutividadeTab.css"

const FIELD_INFO = {
  spikesPerM2: ["Espigas por metro quadrado", "espigas/m²", "Número médio de espigas em um metro quadrado da lavoura."],
  grainsPerSpike: ["Grãos médios por espiga", "grãos", "Conte os grãos de várias espigas representativas e use a média."],
  plantsPerM2: ["Plantas por metro quadrado", "plantas/m²", "Quantidade média de plantas estabelecidas em um metro quadrado."],
  plantsPerLinearMeter: ["Plantas por metro linear", "plantas/m", "Conte as plantas em um metro de linha e use a média dos pontos amostrados."],
  rowSpacingMeters: ["Espaçamento entre linhas", "m", "Distância média entre as linhas de plantio, em metros."],
  podsPerPlant: ["Vagens médias por planta", "vagens", "Número médio de vagens produtivas por planta."],
  grainsPerPod: ["Grãos médios por vagem", "grãos", "Conte os grãos de uma amostra de vagens e calcule a média."],
  thousandGrainWeightG: ["Peso de mil grãos (PMG)", "g", "Peso médio de mil grãos, informado em gramas."],
  lossPercent: ["Perdas esperadas", "%", "Percentual estimado de perdas até a produção aproveitável. Use zero se não quiser ajustar."],
}

const SAMPLING = {
  wheat: [
    "Escolha vários pontos representativos do talhão.",
    "Conte as espigas em uma área conhecida e converta para espigas/m².",
    "Amostre espigas, conte os grãos e calcule a média por espiga.",
    "Informe o PMG medido ou estimado em gramas.",
  ],
  soybean: [
    "Escolha vários pontos representativos do talhão.",
    "Determine a população em plantas/m² ou por metro linear e espaçamento.",
    "Amostre plantas produtivas e calcule a média de vagens por planta.",
    "Conte os grãos de uma amostra de vagens e calcule a média.",
    "Informe o PMG medido ou estimado em gramas.",
  ],
}

const emptyValues = () => ({ spikesPerM2: "", grainsPerSpike: "", plantsPerM2: "", plantsPerLinearMeter: "", rowSpacingMeters: "", podsPerPlant: "", grainsPerPod: "", thousandGrainWeightG: "", lossPercent: "0" })
const cropFromMap = (crop) => /trigo/i.test(String(crop || "")) ? "wheat" : /soja/i.test(String(crop || "")) ? "soybean" : ""

function formatYieldInput(value, previous = "") {
  const raw = String(value ?? "").replace(/\s/g, "").replace(/[^\d.,]/g, "")
  if (!raw) return ""
  const comma = raw.indexOf(",")
  const groupedInteger = /^\d{1,3}(?:\.\d{3})+$/.test(raw)
  const previousDots = (String(previous).match(/\./g) || []).length
  const rawDots = (raw.match(/\./g) || []).length
  const existingGroupDots = comma < 0 && previousDots > 0 && rawDots <= previousDots
  const decimalAt = comma >= 0 ? comma : rawDots > 0 && !groupedInteger && !existingGroupDots ? raw.lastIndexOf(".") : -1
  const integerDigits = (decimalAt >= 0 ? raw.slice(0, decimalAt) : raw).replace(/\D/g, "").replace(/^0+(?=\d)/, "") || "0"
  const integer = integerDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  const decimal = decimalAt >= 0 ? raw.slice(decimalAt + 1).replace(/\D/g, "").slice(0, 6) : ""
  return decimalAt >= 0 ? `${integer},${decimal}` : integer
}

function Field({ name, value, onChange }) {
  const [label, unit, help] = FIELD_INFO[name]
  const inputRef = useRef(null)
  const handleChange = (event) => {
    const raw = event.target.value
    if (/[-+]/.test(raw)) return
    const caret = event.target.selectionStart ?? raw.length
    const formatted = formatYieldInput(raw, value)
    const nextCaret = formatYieldInput(raw.slice(0, caret), value).length
    onChange(name, formatted)
    requestAnimationFrame(() => {
      const input = inputRef.current
      if (input && document.activeElement === input) input.setSelectionRange(nextCaret, nextCaret)
    })
  }
  return <div className="produtividade-field">
    <div className="produtividade-field-heading">
      <label htmlFor={`yield-${name}`}>{label}</label>
      <details className="produtividade-info"><summary aria-label={`Sobre ${label}`} title={`Sobre ${label}`}><span className="material-symbols-outlined" aria-hidden="true">info</span></summary><p>{help}</p></details>
    </div>
    <div className="produtividade-input-wrap">
      <input ref={inputRef} id={`yield-${name}`} type="text" inputMode="decimal" autoComplete="off" maxLength={24} value={value} onChange={handleChange} aria-describedby={`yield-${name}-unit`} />
      <span id={`yield-${name}-unit`}>{unit}</span>
    </div>
  </div>
}

export default function ProdutividadeTab({ onOpenMap }) {
  const { farmData } = useFarm()
  const reducedMotion = useReducedMotion()
  const [plots, setPlots] = useState([])
  const [history, setHistory] = useState([])
  const [loadState, setLoadState] = useState("loading")
  const [historyError, setHistoryError] = useState(false)
  const [plotId, setPlotId] = useState("")
  const [crop, setCrop] = useState("")
  const [populationMode, setPopulationMode] = useState("square")
  const [values, setValues] = useState(emptyValues)
  const [calculated, setCalculated] = useState(null)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const plot = plots.find((item) => item.id === plotId)
  const fingerprint = JSON.stringify({ plotId, areaHa: plot?.areaHa, crop, populationMode, values })
  const result = calculated?.fingerprint === fingerprint ? calculated.result : null
  const plotHistory = useMemo(() => history.filter((item) => item.plotId === plotId).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))), [history, plotId])

  useEffect(() => {
    const refresh = () => {
      try { setPlots(readMappedPlots()); setLoadState("ready") }
      catch { setLoadState("error") }
      try { setHistory(readYieldEstimates()); setHistoryError(false) }
      catch { setHistoryError(true) }
    }
    refresh()
    const onStorage = (event) => { if (event.key === "farmPolygons" || event.key?.startsWith("zenith:yield-estimates:")) refresh() }
    window.addEventListener("focus", refresh)
    window.addEventListener("storage", onStorage)
    window.addEventListener("zenith:farm-areas-updated", refresh)
    return () => {
      window.removeEventListener("focus", refresh)
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("zenith:farm-areas-updated", refresh)
    }
  }, [])

  const changePlot = (nextId) => {
    const selected = plots.find((item) => item.id === nextId)
    setPlotId(nextId)
    setCrop(cropFromMap(selected?.crop))
    setValues(emptyValues())
    setPopulationMode("square")
    setCalculated(null)
    setError("")
    setMessage("")
  }
  const changeCrop = (nextCrop) => { setCrop(nextCrop); setCalculated(null); setError(""); setMessage("") }
  const changeValue = (name, value) => { setValues((current) => ({ ...current, [name]: value })); setError(""); setMessage("") }
  const requiredFields = crop === "wheat" ? ["spikesPerM2", "grainsPerSpike", "thousandGrainWeightG"]
    : populationMode === "linear" ? ["plantsPerLinearMeter", "rowSpacingMeters", "podsPerPlant", "grainsPerPod", "thousandGrainWeightG"]
      : ["plantsPerM2", "podsPerPlant", "grainsPerPod", "thousandGrainWeightG"]
  const canCalculate = Boolean(plot && crop && requiredFields.every((name) => String(values[name]).trim()))

  const calculate = (event) => {
    event.preventDefault()
    if (!canCalculate) return
    try {
      const input = { ...values, lossPercent: String(values.lossPercent).trim() || "0", areaHa: plot.areaHa, populationMode }
      const nextResult = crop === "wheat" ? calculateWheatYield(input) : calculateSoybeanYield(input)
      setCalculated({ fingerprint, result: nextResult, animationId: crypto.randomUUID() })
      setError("")
      setMessage("")
    } catch (cause) {
      setCalculated(null)
      setError(cause instanceof RangeError ? cause.message : "Revise os valores informados e tente novamente.")
    }
  }

  const save = () => {
    if (!result || !plot) return
    const now = new Date().toISOString()
    const fieldNames = [...requiredFields, "lossPercent"]
    const record = {
      id: crypto.randomUUID(), plotId: plot.id, plotName: plot.name, crop,
      season: plot.season, areaHa: plot.areaHa,
      inputData: { populationMode: crop === "soybean" ? populationMode : null, fields: Object.fromEntries(fieldNames.map((name) => [name, { value: parseYieldNumber(values[name] || "0"), source: "manual" }])) },
      theoreticalYieldKgHa: result.theoreticalYieldKgHa,
      adjustedYieldKgHa: result.adjustedYieldKgHa,
      yieldKgHa: result.yieldKgHa,
      yieldBagsHa: result.yieldBagsHa,
      estimatedTotalBags: result.totalBags,
      estimatedTotalKg: result.totalKg,
      totalBags: result.totalBags,
      totalKg: result.totalKg,
      lossPercent: result.lossPercent,
      createdAt: now, updatedAt: now,
    }
    try {
      saveYieldEstimate(record)
      setHistory(readYieldEstimates())
      setMessage("Estimativa salva neste navegador.")
      setError("")
    } catch {
      setError("Não foi possível salvar a estimativa neste navegador.")
      setMessage("")
    }
  }

  return <main className="economia produtividade">
    <header className="economia-intro">
      <div><span className="economia-eyebrow">PLANEJAMENTO DA LAVOURA</span><h2>Estimativa de Produtividade</h2><p>Use os componentes de rendimento medidos no campo para estimar a produção do talhão.</p></div>
      <span className="economia-intro-mark" aria-hidden="true">sc/ha</span>
    </header>

    <div className="produtividade-layout">
      <div className="produtividade-main">
        <section className="economia-panel" aria-labelledby="produtividade-plot-title">
          <div className="economia-panel-heading"><div><span className="economia-eyebrow">01 / ÁREA</span><h3 id="produtividade-plot-title">Talhão mapeado</h3></div></div>
          {loadState === "loading" && <p className="produtividade-state" role="status">Carregando talhões...</p>}
          {loadState === "error" && <p className="economia-feedback is-error" role="alert">Não foi possível carregar os talhões salvos neste navegador. Atualize a página e tente novamente.</p>}
          {loadState === "ready" && !plots.length && <div className="produtividade-empty"><span className="material-symbols-outlined" aria-hidden="true">map</span><div><strong>Nenhum talhão mapeado</strong><p>Desenhe e salve uma área no Mapa para começar a estimativa.</p></div><button type="button" className="economia-save" onClick={onOpenMap}>Abrir Mapa</button></div>}
          {loadState === "ready" && plots.length > 0 && <>
            <label className="economia-field"><span>Talhão</span><select value={plotId} onChange={(event) => changePlot(event.target.value)}><option value="">Selecione um talhão</option>{plots.map((item) => <option key={item.id} value={item.id}>{item.name} · {yieldFormat.area(item.areaHa)} ha</option>)}</select></label>
            {plot && <div className="produtividade-plot-meta"><span><small>Área mapeada</small><strong>{yieldFormat.area(plot.areaHa)} ha</strong></span>{(plot.property || farmData?.name) && <span><small>Propriedade</small><strong>{plot.property || farmData.name}</strong></span>}{plot.crop && <span><small>Cultura cadastrada</small><strong>{plot.crop}</strong></span>}{plot.season && <span><small>Safra</small><strong>{plot.season}</strong></span>}</div>}
          </>}
        </section>

        {plot && <section className="economia-panel" aria-labelledby="produtividade-crop-title">
          <div className="economia-panel-heading"><div><span className="economia-eyebrow">02 / CULTURA</span><h3 id="produtividade-crop-title">Escolha a cultura</h3></div></div>
          <div className="produtividade-crops" role="group" aria-label="Cultura da estimativa">{Object.entries(YIELD_CROPS).map(([key, label]) => <button type="button" key={key} className={`produtividade-crop ${crop === key ? "is-active" : ""}`} aria-pressed={crop === key} onClick={() => changeCrop(key)}><span className="material-symbols-outlined" aria-hidden="true">{key === "soybean" ? "eco" : "grass"}</span><strong>{label}</strong></button>)}</div>
        </section>}

        {plot && crop && <form className="economia-panel" onSubmit={calculate} noValidate aria-labelledby="produtividade-fields-title">
          <div className="economia-panel-heading"><div><span className="economia-eyebrow">03 / AMOSTRAGEM</span><h3 id="produtividade-fields-title">Dados da lavoura</h3></div><span className="economia-unit">{YIELD_CROPS[crop].toUpperCase()}</span></div>
          {crop === "soybean" && <div className="produtividade-mode" role="group" aria-label="Forma de informar população"><button type="button" aria-pressed={populationMode === "square"} className={populationMode === "square" ? "is-active" : ""} onClick={() => { setPopulationMode("square"); setError("") }}>Plantas/m²</button><button type="button" aria-pressed={populationMode === "linear"} className={populationMode === "linear" ? "is-active" : ""} onClick={() => { setPopulationMode("linear"); setError("") }}>Metro linear + espaçamento</button></div>}
          <p className="produtividade-number-hint">Use vírgula para decimais. Os milhares são separados automaticamente.</p>
          <div className="produtividade-fields">
            {(crop === "wheat" ? ["spikesPerM2", "grainsPerSpike", "thousandGrainWeightG", "lossPercent"] : populationMode === "linear" ? ["plantsPerLinearMeter", "rowSpacingMeters", "podsPerPlant", "grainsPerPod", "thousandGrainWeightG", "lossPercent"] : ["plantsPerM2", "podsPerPlant", "grainsPerPod", "thousandGrainWeightG", "lossPercent"]).map((name) => <Field key={name} name={name} value={values[name]} onChange={changeValue} />)}
          </div>
          <details className="produtividade-sampling"><summary>Como coletar os dados?</summary><ol>{SAMPLING[crop].map((step) => <li key={step}>{step}</li>)}</ol></details>
          {error && <p className="economia-feedback is-error" role="alert">{error}</p>}
          {message && <p className="economia-feedback is-success" role="status">{message}</p>}
          <div className="economia-actions"><button className="economia-save" type="submit" disabled={!canCalculate}>Calcular estimativa</button>{result && <button className="produtividade-secondary" type="button" onClick={save}>Salvar estimativa</button>}</div>
        </form>}

        {result && <motion.section key={calculated.animationId} className="economia-panel produtividade-result" aria-labelledby="produtividade-result-title" aria-live="polite" initial={reducedMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : .42, ease: [0.22, 1, 0.36, 1] }}>
          <div className="economia-panel-heading"><div><span className="economia-eyebrow">04 / RESULTADO</span><h3 id="produtividade-result-title">Estimativa ajustada</h3></div><span className="produtividade-status">Estimativa calculada</span></div>
          <motion.div className="produtividade-result-hero" initial={reducedMotion ? false : { opacity: 0, y: 10, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reducedMotion ? 0 : .48, delay: reducedMotion ? 0 : .08, ease: [0.22, 1, 0.36, 1] }}><span>Produtividade estimada</span><strong>{yieldFormat.bagsHa(result.yieldBagsHa)} <small>sc/ha</small></strong><p>{yieldFormat.kgHa(result.adjustedYieldKgHa)} kg/ha</p></motion.div>
          <motion.div className="economia-results" initial={reducedMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : .38, delay: reducedMotion ? 0 : .18 }}><div className="economia-metric"><span>PRODUÇÃO ESTIMADA DO TALHÃO</span><strong>{yieldFormat.bags(result.totalBags)} sacas</strong><small>{yieldFormat.area(plot.areaHa)} ha × {yieldFormat.bagsHa(result.yieldBagsHa)} sc/ha</small></div><div className="economia-metric economia-metric-primary"><span>PRODUÇÃO ESTIMADA EM PESO</span><strong>{yieldFormat.tonnes(result.totalKg)} t</strong><small>{yieldFormat.kg(result.totalKg)} kg</small></div></motion.div>
          <motion.div className="produtividade-breakdown" initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : .35, delay: reducedMotion ? 0 : .26 }}><div><span>Potencial teórico</span><strong>{yieldFormat.bagsHa(result.theoreticalYieldBagsHa)} sc/ha</strong><small>{yieldFormat.kgHa(result.theoreticalYieldKgHa)} kg/ha</small></div><div><span>Perdas consideradas</span><strong>{yieldFormat.decimal(result.lossPercent)}%</strong></div><div><span>Estimativa ajustada</span><strong>{yieldFormat.bagsHa(result.yieldBagsHa)} sc/ha</strong><small>{yieldFormat.kgHa(result.adjustedYieldKgHa)} kg/ha</small></div></motion.div>
          <p className="produtividade-method">Cálculo: componentes de rendimento × PMG ÷ 100; depois são aplicadas as perdas informadas. Saca de {YIELD_CROPS[crop].toLowerCase()}: 60 kg. {crop === "soybean" && `População usada: ${yieldFormat.decimal(result.plantsPerM2)} plantas/m².`}</p>
        </motion.section>}
        <p className="economia-disclaimer">Esta é uma estimativa baseada nos componentes de rendimento informados. A produtividade real pode variar com clima, manejo, doenças, pragas, solo, enchimento dos grãos e perdas na colheita.</p>
      </div>

      <aside className="economia-sidebar produtividade-history" aria-label="Histórico de estimativas do talhão"><span className="economia-eyebrow">HISTÓRICO</span><h3>Estimativas anteriores</h3>{historyError ? <p className="economia-feedback is-error" role="alert">Não foi possível carregar o histórico neste navegador.</p> : !plot ? <p className="economia-sidebar-empty">Selecione um talhão para ver seu histórico.</p> : !plotHistory.length ? <p className="economia-sidebar-empty">Nenhuma estimativa salva para este talhão.</p> : <ol>{plotHistory.map((item) => <li key={item.id}><span>{new Date(item.createdAt).toLocaleDateString("pt-BR")}</span><strong>{YIELD_CROPS[item.crop] || item.crop}</strong><b>{yieldFormat.bagsHa(Number(item.yieldBagsHa))} sc/ha</b></li>)}</ol>}<p className="economia-local-note"><span className="material-symbols-outlined" aria-hidden="true">info</span>As estimativas ficam salvas apenas neste navegador.</p></aside>
    </div>
  </main>
}
