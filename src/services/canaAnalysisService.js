import { Client, handle_file } from "@gradio/client"

const SPACE_URL = (
  import.meta.env.VITE_CANA_ANALYSIS_SPACE_URL ||
  "https://octaviorezendesilva-zenith-cana.hf.space"
).replace(/\/$/, "")
const ENDPOINT = "/analyze"
const REQUEST_TIMEOUT_MS = 10 * 60 * 1000
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_FILE_SIZE_MB = 50

export const CANA_ANALYSIS_DEFAULTS = Object.freeze({
  mode: "aerial",
  gridSize: 8,
  confidence: 0.25,
  tileSize: 1024,
  overlap: 0.2,
  gsdCmPerPixel: 0,
})

export function validateCanaImage(file) {
  if (!file) return "Nenhum arquivo selecionado."
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Formato não suportado. Use JPG, PNG ou WebP."
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `Arquivo muito grande. Máximo permitido: ${MAX_FILE_SIZE_MB} MB.`
  }
  return null
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number(value) || 0))
}

function parseResult(value) {
  if (value && typeof value === "object") return value
  if (typeof value !== "string") return null
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" ? parsed : null
  } catch {
    return null
  }
}

export function resolveCanaFileUrl(file) {
  if (!file) return null
  if (Array.isArray(file)) return resolveCanaFileUrl(file[0])
  if (typeof file === "object") {
    return resolveCanaFileUrl(
      file.url || file.path || file.name || file.value || file.data,
    )
  }
  if (typeof file !== "string") return null
  const value = file.trim()
  if (!value) return null
  if (/^(https?:|blob:|data:)/i.test(value)) return value
  if (/^[a-z]:\\/i.test(value)) return null
  if (value.startsWith("/")) return `${SPACE_URL}${value}`
  if (value.startsWith("gradio_api/") || value.startsWith("file=")) {
    return `${SPACE_URL}/${value}`
  }
  return null
}

function flattenGrid(grid) {
  if (!Array.isArray(grid)) return []
  return grid.flat(3).map(Number).filter(Number.isFinite)
}

function spatialConsistency(grid) {
  const values = flattenGrid(grid)
  if (!values.length) return null
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  if (mean <= 0) return 0
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  return clamp(1 - Math.sqrt(variance) / mean)
}

function attentionLevel(regionCount, gridSize) {
  const totalCells = Math.max(1, Number(gridSize || CANA_ANALYSIS_DEFAULTS.gridSize) ** 2)
  const score = clamp(regionCount / totalCells)
  if (score >= 0.25) return { score, level: "ALTO" }
  if (score >= 0.1) return { score, level: "MEDIO" }
  return { score, level: "BAIXO" }
}

function priorityToLevel(priority, fallback) {
  const normalized = String(priority || "").toLowerCase()
  if (normalized === "alta") return "ALTO"
  if (normalized === "moderada") return "MEDIO"
  if (normalized === "baixa") return "BAIXO"
  return fallback
}

function normalizeResponse(data) {
  if (!Array.isArray(data) || data.length < 4) {
    throw new Error("A análise terminou, mas o servidor retornou uma resposta incompleta.")
  }

  const technical = parseResult(data[2])
  const analysisUrl = resolveCanaFileUrl(data[0])
  const jsonDownloadUrl = resolveCanaFileUrl(data[3])
  const pipelineStages = {
    mask: resolveCanaFileUrl(data[4]),
    rows: resolveCanaFileUrl(data[5]),
    intersections: resolveCanaFileUrl(data[6]),
  }
  const pipelineStageCount = Object.values(pipelineStages).filter(Boolean).length
  if (!technical || !analysisUrl) {
    throw new Error("O servidor não retornou os dados esperados para esta análise.")
  }

  const request = technical.request || {}
  const selectedMode = request.selected_mode || request.mode || technical.selected_mode || "aerial"
  const gridSize = Number(request.grid_size || CANA_ANALYSIS_DEFAULTS.gridSize)
  const coveragePercent = Number(
    technical.overall_vegetation_cover_percent ?? technical.vegetation_cover_percent,
  )
  const coverage = Number.isFinite(coveragePercent) ? clamp(coveragePercent / 100) : null
  const grid =
    technical.grid_vegetation_cover_percent ||
    technical.grid_cover_percent ||
    technical.coverage_grid
  const canopy = technical.canopy_uniformity_assessment || {}
  const analysisProfile = technical.analysis_profile || "fileiras_visiveis"
  const attentionRegions = analysisProfile === "dossel_fechado"
    ? canopy.attention_regions || []
    : technical.inspection_zones ||
      technical.possible_cover_discontinuities ||
      technical.possible_low_vegetation_density_regions ||
      technical.low_vegetation_density_regions ||
      technical.stand_analysis?.attention_regions ||
      []
  const regionCount = Array.isArray(attentionRegions)
    ? attentionRegions.length
    : Number(attentionRegions?.count || 0)
  const attention = attentionLevel(regionCount, gridSize)
  const stand = technical.cane_stand_assessment || {}
  const interrow = technical.interrow_vegetation_assessment || {}
  const geometry = technical.row_geometry_assessment || {}
  const standReliable = stand.reliable === true
  const standUsable = stand.publishable === true || standReliable
  const canopyUsable = canopy.publishable === true
  const analysisUsable = standUsable || canopyUsable
  const toFiniteNumber = (value) => value == null || value === "" ? null : Number(value)
  const standIntegrityPercent = toFiniteNumber(stand.visual_stand_integrity_percent)
  const gapSharePercent = toFiniteNumber(stand.possible_gap_share_percent)
  const interrowSharePercent = toFiniteNumber(interrow.share_of_detected_vegetation_percent)
  const gridConsistency = spatialConsistency(grid)
  const rowConfidence = clamp(
    technical.row_structure_confidence ??
    technical.rows?.confidence ??
    technical.mean_confidence ??
    0,
  )
  const rowCount = Number(technical.estimated_rows ?? technical.rows?.estimated_rows)
  const orientation = Number(
    technical.dominant_row_angle_degrees ?? technical.rows?.angle_degrees,
  )
  const warnings = [
    ...(Array.isArray(technical.warnings) ? technical.warnings : []),
    ...(Array.isArray(technical.limitations) ? technical.limitations : []),
  ].filter((value) => typeof value === "string" && value.trim())

  return {
    coverage,
    veg_index_mean: coverage,
    uniformity: canopyUsable && Number.isFinite(Number(canopy.uniformity_percent))
      ? clamp(Number(canopy.uniformity_percent) / 100)
      : standUsable && Number.isFinite(standIntegrityPercent)
        ? clamp(standIntegrityPercent / 100)
        : gridConsistency,
    spatial_consistency: gridConsistency,
    failure_score: Number.isFinite(gapSharePercent)
      ? clamp(gapSharePercent / 100)
      : attention.score,
    failure_level: priorityToLevel(stand.inspection_priority, attention.level),
    inspection_region_count: regionCount,
    attention_regions: attentionRegions,
    analysis_status: canopyUsable ? "dossel_fechado" : stand.status || (standReliable ? "adequada" : "inconclusiva"),
    analysis_profile: analysisProfile,
    analysis_reliable: standReliable,
    analysis_usable: analysisUsable,
    stand_analysis_usable: standUsable,
    canopy_analysis_usable: canopyUsable,
    quality_reasons: Array.isArray(stand.quality_reasons) ? stand.quality_reasons : [],
    row_geometry_score: Number.isFinite(Number(geometry.visual_quality_score))
      ? clamp(geometry.visual_quality_score)
      : rowConfidence,
    stand_integrity: standUsable && Number.isFinite(standIntegrityPercent) ? clamp(standIntegrityPercent / 100) : null,
    possible_gap_share: standUsable && Number.isFinite(gapSharePercent) ? clamp(gapSharePercent / 100) : null,
    possible_gap_length_meters: stand.total_possible_gap_length_meters ?? null,
    possible_gap_length_pixels: stand.total_possible_gap_length_pixels ?? null,
    largest_gap_meters: stand.largest_possible_gap_meters ?? null,
    rows_with_possible_gaps: stand.rows_with_possible_gaps ?? null,
    row_inventory: Array.isArray(technical.rows) ? technical.rows : [],
    row_detection_summary: technical.row_detection_summary || null,
    row_orientation_assessment: technical.row_orientation_assessment || null,
    canopy_uniformity: Number.isFinite(Number(canopy.uniformity_percent))
      ? clamp(Number(canopy.uniformity_percent) / 100)
      : null,
    canopy_reference_cover: Number.isFinite(Number(canopy.reference_cover_percent))
      ? clamp(Number(canopy.reference_cover_percent) / 100)
      : null,
    interrow_vegetation_share: interrow.assessed !== false && Number.isFinite(interrowSharePercent)
      ? clamp(interrowSharePercent / 100)
      : null,
    interrow_assessed: interrow.assessed ?? false,
    interrow_inspection_priority: interrow.inspection_priority ?? null,
    median_row_spacing_meters: technical.median_row_spacing_meters ?? null,
    median_row_spacing_pixels: technical.median_row_spacing_pixels ?? null,
    rows: {
      detected: standUsable && Number.isFinite(rowCount) && rowCount > 0,
      orientation_deg: Number.isFinite(orientation) ? orientation : null,
      row_spacing_px: null,
      row_count: Number.isFinite(rowCount) ? rowCount : null,
      periodicity_snr: rowConfidence,
    },
    confidence: Math.round(rowConfidence * 100),
    analysis_mode: selectedMode,
    method: technical.method || null,
    analysis_revision: technical.analysis_revision || null,
    source_dimensions: {
      width: Number(technical.width) || null,
      height: Number(technical.height) || null,
    },
    summaryMarkdown: typeof data[1] === "string" ? data[1] : "",
    analysisUrl,
    analysisSrc: null,
    pipelineStages,
    pipelineStageCount,
    pipelineComplete: pipelineStageCount === 3,
    jsonDownloadUrl,
    technical,
    warnings,
    _apiVersion: technical.method === "sugarcane_rgb_stand_v9"
      ? "zenith-cana-hf-v9"
      : technical.method === "sugarcane_rgb_stand_v8"
      ? "zenith-cana-hf-v8"
      : technical.method === "sugarcane_rgb_stand_v7"
      ? "zenith-cana-hf-v7"
      : technical.method === "sugarcane_rgb_stand_v6"
      ? "zenith-cana-hf-v6"
      : technical.method === "sugarcane_rgb_stand_v5"
      ? "zenith-cana-hf-v5"
      : technical.method === "sugarcane_rgb_stand_v4"
      ? "zenith-cana-hf-v4"
      : technical.method === "sugarcane_rgb_stand_v3"
        ? "zenith-cana-hf-v3"
        : technical.method === "sugarcane_rgb_stand_v2"
          ? "zenith-cana-hf-v2"
          : "zenith-cana-hf-v1",
  }
}

function friendlyError(error) {
  const rawMessage = String(error?.message || error || "")
  const lowerMessage = rawMessage.toLowerCase()
  if (lowerMessage.includes("zerogpu") || lowerMessage.includes("gpu quota")) {
    const retryMatch = rawMessage.match(/try again in\s+([0-9:]+)/i)
    const retryText = retryMatch?.[1]
      ? ` A previsão informada para liberação é em ${retryMatch[1]}.`
      : " Tente novamente mais tarde."
    return new Error(
      `O serviço atingiu o limite temporário de GPU do provedor.${retryText} A imagem enviada não apresenta problema.`,
    )
  }
  if (error?.name === "AbortError" || lowerMessage.includes("aborted") || lowerMessage.includes("cancel")) {
    return new Error("A análise foi interrompida.")
  }
  if (lowerMessage.includes("timeout") || lowerMessage.includes("tempo limite")) {
    return new Error("A análise excedeu o tempo esperado. O serviço pode estar iniciando; tente novamente em alguns instantes.")
  }
  if (lowerMessage.includes("failed to fetch") || lowerMessage.includes("network")) {
    return new Error("Não foi possível comunicar com o serviço de análise. Verifique sua conexão e tente novamente.")
  }
  if (lowerMessage.includes("space") && (lowerMessage.includes("error") || lowerMessage.includes("paused"))) {
    return new Error("O serviço de análise está temporariamente indisponível. Tente novamente em alguns minutos.")
  }
  const cleanMessage = rawMessage
    .replace(/^Error:\s*/i, "")
    .replace(/Traceback[\s\S]*/i, "")
    .trim()
  return new Error(cleanMessage || "Não foi possível concluir a análise da cana-de-açúcar.")
}

export async function analyzeCanaImage(file, options = {}) {
  const validationError = validateCanaImage(file)
  if (validationError) throw new Error(validationError)

  const { signal, onStatus = () => {}, mode = CANA_ANALYSIS_DEFAULTS.mode } = options
  let submission = null
  let timeoutId = null
  let abortHandler = null

  try {
    onStatus("connecting")
    const client = await Client.connect(SPACE_URL, {
      events: ["data", "status"],
      record_history: false,
      status_callback: (spaceStatus) => {
        if (["sleeping", "starting", "building"].includes(spaceStatus?.status)) onStatus("waking")
        if (["space_error", "paused", "error", "stopped"].includes(spaceStatus?.status)) onStatus("unavailable")
      },
    })
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError")

    onStatus("uploading")
    const payload = [
      handle_file(file),
      mode,
      CANA_ANALYSIS_DEFAULTS.gridSize,
      CANA_ANALYSIS_DEFAULTS.confidence,
      CANA_ANALYSIS_DEFAULTS.tileSize,
      CANA_ANALYSIS_DEFAULTS.overlap,
      CANA_ANALYSIS_DEFAULTS.gsdCmPerPixel,
    ]

    submission = client.submit(ENDPOINT, payload)
    abortHandler = () => submission?.cancel()
    signal?.addEventListener("abort", abortHandler, { once: true })

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => {
        submission?.cancel()
        reject(new Error("timeout"))
      }, REQUEST_TIMEOUT_MS)
    })
    const responsePromise = (async () => {
      for await (const event of submission) {
        if (event.type === "status") {
          if (event.stage === "pending") onStatus("queued")
          if (event.stage === "generating") onStatus("analyzing")
          if (event.stage === "error") throw new Error(event.message || "Falha no processamento da imagem.")
        }
        if (event.type === "data") {
          onStatus("finalizing")
          return normalizeResponse(event.data)
        }
      }
      throw new Error("O serviço encerrou a solicitação sem retornar resultados.")
    })()

    return await Promise.race([responsePromise, timeoutPromise])
  } catch (error) {
    throw friendlyError(error)
  } finally {
    window.clearTimeout(timeoutId)
    if (abortHandler) signal?.removeEventListener("abort", abortHandler)
  }
}

export { SPACE_URL as CANA_ANALYSIS_SPACE_URL }
