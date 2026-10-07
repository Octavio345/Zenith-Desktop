const KNOWN_DIAGNOSIS_LABELS = {
  ataque_de_largata_soja: "Ataque de lagarta na soja",
  ataque_de_lagarta_soja: "Ataque de lagarta na soja",
  cercospora: "Cercosporiose da soja",
  doenca_de_ferrugem_soja: "Ferrugem da soja",
  doenca_ferrugem_soja: "Ferrugem da soja",
  soja_saudavel: "Soja saudável",
  healthy: "Trigo saudável",
  septoria: "Septoriose do trigo",
  stripe_rust: "Ferrugem amarela do trigo"
}

const WORD_REPLACEMENTS = {
  doenca: "doença",
  saudavel: "saudável",
  ferrugem: "ferrugem",
  soja: "soja",
  lagarta: "lagarta",
  largata: "lagarta",
  cercospora: "cercóspora"
}

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function capitalizeFirst(value) {
  if (!value) return ""
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function formatDiagnosisName(value) {
  const rawValue = String(value || "").trim()
  if (!rawValue) return "Triagem"

  const key = normalizeKey(rawValue)
  if (KNOWN_DIAGNOSIS_LABELS[key]) return KNOWN_DIAGNOSIS_LABELS[key]

  if (!rawValue.includes("_")) return rawValue

  const readableName = rawValue
    .split("_")
    .filter(Boolean)
    .map(part => WORD_REPLACEMENTS[normalizeKey(part)] || part.toLowerCase())
    .join(" ")

  return capitalizeFirst(readableName)
}
