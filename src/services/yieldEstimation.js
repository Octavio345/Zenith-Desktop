export const YIELD_CROPS = Object.freeze({ soybean: "Soja", wheat: "Trigo" })
export const BAG_KG = 60

export function parseYieldNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN
  const raw = String(value ?? "").trim().replace(/\s/g, "")
  if (!raw) return NaN
  if (!/^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?$|^\d+(?:\.\d+)?$/.test(raw)) return NaN
  const normalized = raw.includes(",") || /^\d{1,3}(?:\.\d{3})+$/.test(raw)
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw
  return Number(normalized)
}

function positive(value, label) {
  const number = parseYieldNumber(value)
  if (!Number.isFinite(number) || number <= 0) throw new RangeError(`${label} deve ser maior que zero.`)
  return number
}

export function applyExpectedLosses(theoreticalKgHa, lossPercent = 0) {
  const losses = parseYieldNumber(lossPercent)
  if (!Number.isFinite(losses) || losses < 0 || losses > 100) throw new RangeError("Perdas devem estar entre 0% e 100%.")
  return theoreticalKgHa * (1 - losses / 100)
}

export function getSoybeanPlantsPerM2(plantsPerLinearMeter, rowSpacingMeters) {
  return positive(plantsPerLinearMeter, "Plantas por metro linear") / positive(rowSpacingMeters, "Espaçamento entre linhas")
}

export function calculateTotalProduction(adjustedYieldKgHa, areaHa) {
  const area = positive(areaHa, "Área do talhão")
  const totalKg = adjustedYieldKgHa * area
  const totalBags = totalKg / BAG_KG
  if (!Number.isFinite(totalKg) || !Number.isFinite(totalBags)) throw new RangeError("Os valores informados são muito altos.")
  return { totalKg, totalBags }
}

function finishCalculation(theoreticalYieldKgHa, grainCountM2, lossPercent, areaHa) {
  const adjustedYieldKgHa = applyExpectedLosses(theoreticalYieldKgHa, lossPercent)
  const { totalKg, totalBags } = calculateTotalProduction(adjustedYieldKgHa, areaHa)
  if (!Number.isFinite(theoreticalYieldKgHa) || !Number.isFinite(adjustedYieldKgHa)) throw new RangeError("Os valores informados são muito altos.")
  return {
    grainCountM2,
    theoreticalYieldKgHa,
    theoreticalYieldBagsHa: theoreticalYieldKgHa / BAG_KG,
    adjustedYieldKgHa,
    yieldKgHa: adjustedYieldKgHa,
    yieldBagsHa: adjustedYieldKgHa / BAG_KG,
    totalKg,
    totalBags,
    lossPercent: parseYieldNumber(lossPercent),
  }
}

export function calculateWheatYield({ spikesPerM2, grainsPerSpike, thousandGrainWeightG, lossPercent = 0, areaHa }) {
  const spikes = positive(spikesPerM2, "Espigas por m²")
  const grains = positive(grainsPerSpike, "Grãos por espiga")
  const weight = positive(thousandGrainWeightG, "PMG")
  const grainCountM2 = spikes * grains
  return finishCalculation(spikes * grains * weight / 100, grainCountM2, lossPercent, areaHa)
}

export function calculateSoybeanYield({ plantsPerM2, plantsPerLinearMeter, rowSpacingMeters, populationMode = "square", podsPerPlant, grainsPerPod, thousandGrainWeightG, lossPercent = 0, areaHa }) {
  const plants = populationMode === "linear"
    ? getSoybeanPlantsPerM2(plantsPerLinearMeter, rowSpacingMeters)
    : positive(plantsPerM2, "Plantas por m²")
  const pods = positive(podsPerPlant, "Vagens por planta")
  const grains = positive(grainsPerPod, "Grãos por vagem")
  const weight = positive(thousandGrainWeightG, "PMG")
  const grainCountM2 = plants * pods * grains
  return { ...finishCalculation(grainCountM2 * weight / 100, grainCountM2, lossPercent, areaHa), plantsPerM2: plants }
}

export const yieldFormat = {
  bagsHa: (value) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value),
  kgHa: (value) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value),
  bags: (value) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value),
  kg: (value) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value),
  tonnes: (value) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 1000),
  area: (value) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 }).format(value),
  decimal: (value) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value),
}
