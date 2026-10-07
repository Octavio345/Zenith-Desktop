import { auth } from "./firebase"

const AREA_KEY = "farmPolygons"
const historyKey = () => `zenith:yield-estimates:v1:${auth.currentUser?.uid || "local"}`

export function readMappedPlots() {
  const raw = JSON.parse(localStorage.getItem(AREA_KEY) || "[]")
  if (!Array.isArray(raw)) throw new Error("Áreas inválidas")
  return raw
    .filter((area) => area && area.id != null && Number.isFinite(Number(area.areaHa)) && Number(area.areaHa) > 0)
    .map((area) => ({
      id: String(area.id),
      name: area.name || "Área sem nome",
      areaHa: Number(area.areaHa),
      crop: area.crop || null,
      season: area.season || null,
      property: area.property || null,
    }))
}

export function readYieldEstimates() {
  const raw = JSON.parse(localStorage.getItem(historyKey()) || "[]")
  if (!Array.isArray(raw)) throw new Error("Histórico inválido")
  return raw.filter((item) => item && item.id && item.plotId)
}

export function saveYieldEstimate(record) {
  const existing = readYieldEstimates()
  localStorage.setItem(historyKey(), JSON.stringify([record, ...existing]))
}
