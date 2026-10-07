const ACTIVITY_DRAFT_KEY = "zenithActivityDraft"
const OCCURRENCES_KEY = "zenithFieldOccurrences"

function notifyOccurrencesChanged() {
  window.dispatchEvent(new Event("zenith:field-occurrences-updated"))
}

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

export function getActivityDraft() {
  return readJson(ACTIVITY_DRAFT_KEY, null)
}

export function saveActivityDraft(draft) {
  localStorage.setItem(ACTIVITY_DRAFT_KEY, JSON.stringify(draft))
}

export function clearActivityDraft() {
  localStorage.removeItem(ACTIVITY_DRAFT_KEY)
}

export function getFieldOccurrences() {
  const occurrences = readJson(OCCURRENCES_KEY, [])
  return Array.isArray(occurrences) ? occurrences : []
}

export function saveFieldOccurrence(occurrence) {
  const next = [occurrence, ...getFieldOccurrences()].slice(0, 100)
  localStorage.setItem(OCCURRENCES_KEY, JSON.stringify(next))
  notifyOccurrencesChanged()
  return occurrence
}

export function removeFieldOccurrence(occurrenceId) {
  if (!occurrenceId) return
  const next = getFieldOccurrences().filter((occurrence) => occurrence.id !== occurrenceId)
  localStorage.setItem(OCCURRENCES_KEY, JSON.stringify(next))
  notifyOccurrencesChanged()
}

export function removeFieldOccurrencesForAreas(areaIds) {
  const ids = new Set(areaIds.filter(Boolean))
  if (ids.size === 0) return
  const next = getFieldOccurrences().filter((occurrence) => !ids.has(occurrence.fieldAreaId))
  localStorage.setItem(OCCURRENCES_KEY, JSON.stringify(next))
  notifyOccurrencesChanged()
}

export function createOccurrenceFromAnalysis({ result, fieldArea, imageCount = 0, source = "diagnostico" }) {
  const general = result?.resultado_geral || result || {}
  const condition = general.condicao_predominante || general.doenca || general.disease || "Análise para vistoria"
  const confidence = Number(general.confianca_media ?? general.confianca ?? general.confidence) || 0

  return saveFieldOccurrence({
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    source,
    cultura: result?.cultura || general.cultura || "soja",
    condition,
    confidence: Math.max(0, Math.min(100, Math.round(confidence))),
    fieldAreaId: fieldArea?.id || "",
    fieldAreaName: fieldArea?.name || "Talhão não informado",
    imageCount,
    status: "aguarda_vistoria",
    createdAt: new Date().toISOString()
  })
}
