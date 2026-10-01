import { auth } from "./firebase"

export const COST_CATEGORIES = [
  { key: "seeds", label: "Sementes" },
  { key: "fertilizers", label: "Fertilizantes" },
  { key: "pesticides", label: "Defensivos" },
  { key: "machinery", label: "Operações mecanizadas" },
  { key: "fuel", label: "Combustível" },
  { key: "labor", label: "Mão de obra" },
  { key: "other", label: "Outros" },
]

const storageKey = () => `zenith:economic-estimates:v1:${auth.currentUser?.uid || "local"}`

export function parseBrazilianNumber(value) {
  const input = String(value ?? "").trim().replace(/\s/g, "")
  if (!input) return 0
  if (!/^\d[\d.,]*$/.test(input)) return NaN
  const comma = input.lastIndexOf(",")
  const dot = input.lastIndexOf(".")
  let normalized = input
  if (comma >= 0) {
    normalized = input.replace(/\./g, "").replace(",", ".")
  } else if (dot >= 0 && /^\d{1,3}(\.\d{3})+$/.test(input)) {
    normalized = input.replace(/\./g, "")
  }
  const result = Number(normalized)
  return Number.isFinite(result) ? result : NaN
}

export function calculateEstimate(costs, areaHa) {
  const rows = COST_CATEGORIES.map(({ key, label }) => {
    const value = parseBrazilianNumber(costs?.[key])
    const cents = Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : NaN
    return { key, label, cents }
  })
  const validCosts = rows.every((row) => Number.isSafeInteger(row.cents) && row.cents <= 99999999900)
  const sum = validCosts ? rows.reduce((total, row) => total + row.cents, 0) : 0
  const valid = validCosts && Number.isSafeInteger(sum) && Number.isFinite(areaHa) && areaHa > 0 && areaHa <= 10000000 && Number.isSafeInteger(Math.round(sum * areaHa))
  const perHaCents = validCosts && Number.isSafeInteger(sum) ? sum : 0
  return {
    valid,
    rows,
    perHaCents,
    totalCents: valid ? Math.round(perHaCents * areaHa) : 0,
  }
}

// A saca de soja usada na projeção equivale a 60 kg. Só há resultado
// econômico quando preço e produtividade forem informados pelo produtor.
export function calculateProjection(costs, areaHa, yieldScHa, pricePerSack) {
  const estimate = calculateEstimate(costs, areaHa)
  const sacksPerHa = parseBrazilianNumber(yieldScHa)
  const price = parseBrazilianNumber(pricePerSack)
  const priceCents = Math.round(price * 100)
  const valid = estimate.valid && sacksPerHa > 0 && sacksPerHa <= 1000 &&
    Number.isFinite(sacksPerHa) && Number.isSafeInteger(priceCents) &&
    priceCents > 0 && priceCents <= 99999999900 &&
    Number.isSafeInteger(Math.round(sacksPerHa * priceCents * areaHa))
  if (!valid) return { valid: false }

  const revenuePerHaCents = Math.round(sacksPerHa * priceCents)
  const revenueCents = Math.round(sacksPerHa * priceCents * areaHa)
  const resultPerHaCents = revenuePerHaCents - estimate.perHaCents
  const resultCents = revenueCents - estimate.totalCents

  return {
    valid: true,
    revenuePerHaCents,
    revenueCents,
    resultPerHaCents,
    resultCents,
    marginPercent: revenueCents > 0 ? resultCents / revenueCents * 100 : 0,
    // Arredondar para cima impede mostrar um valor abaixo do necessário
    // para cobrir os custos informados.
    breakEvenScHa: Math.ceil(estimate.perHaCents * 100 / priceCents) / 100,
    breakEvenPriceCents: Math.ceil(estimate.perHaCents / sacksPerHa),
  }
}

export function readEstimates() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey()) || "[]")
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === "object") : []
  } catch {
    return []
  }
}

export function writeEstimates(estimates) {
  localStorage.setItem(storageKey(), JSON.stringify(estimates))
}

export function readMappedAreas() {
  try {
    const parsed = JSON.parse(localStorage.getItem("farmPolygons") || "[]")
    return Array.isArray(parsed)
      ? parsed.filter((area) => area && area.id != null && Number(area.areaHa) > 0)
      : []
  } catch {
    return []
  }
}
