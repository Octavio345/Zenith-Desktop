const API_URL =
  import.meta.env?.VITE_MONITORAMENTO_API_URL ||
  "https://tccamsamericana-monitoramento-plantacao.hf.space/analyze"

const TIMEOUT_MS = 40000
const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"]
const MAX_TAMANHO_MB = 30

export function validarArquivo(file) {
  if (!file) return "Nenhum arquivo selecionado."

  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    return "Formato não aceito. Use JPG, PNG ou WebP."
  }

  if (file.size > MAX_TAMANHO_MB * 1024 * 1024) {
    return `Arquivo muito grande. Tamanho máximo: ${MAX_TAMANHO_MB} MB.`
  }

  return null
}

export function resultadoConclusivo(data) {
  if (!data) return false
  return data.is_plantation !== false &&
    data.analysis_status !== "inconclusive" &&
    data.analysis_status !== "partial" &&
    !data.processing_warnings?.length
}

function normalizarNivelFalha(level) {
  const valor = String(level || "BAIXO").toUpperCase()
  if (valor.includes("ALTO")) return "ALTO"
  if (valor.includes("MED")) return "MEDIO"
  if (valor.startsWith("M")) return "MEDIO"
  return "BAIXO"
}

function normalizarResposta(data) {
  const isV2 = "coverage" in data || "failure_level" in data
  const imageSrc = data.overlay_image
    ? `data:image/jpeg;base64,${data.overlay_image}`
    : null
  const debugSrc = data.debug_image
    ? `data:image/jpeg;base64,${data.debug_image}`
    : null

  if (isV2) {
    return {
      ...data,
      failure_level: normalizarNivelFalha(data.failure_level),
      imageSrc,
      debugSrc,
    }
  }

  const alignmentSNR = data.alignment?.variation
    ? Math.max(0, 1 - data.alignment.variation / 30)
    : 0

  return {
    coverage: data.density ?? 0,
    veg_index_mean: data.density ?? 0,
    failure_score: data.failure_score ?? 0,
    failure_level: normalizarNivelFalha(data.failures),
    failure_zones: [],
    uniformity: data.uniformity ?? 0,
    rows: {
      detected: data.alignment?.aligned ?? false,
      orientation_deg: null,
      row_spacing_px: null,
      row_count: null,
      periodicity_snr: alignmentSNR,
    },
    shadow_coverage: 0,
    path_coverage: 0,
    illumination_quality: "good",
    overlay_image: data.overlay_image,
    imageSrc,
    debugSrc,
    _apiVersion: "v1",
  }
}

export async function analisarImagem(file) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  const formData = new FormData()
  formData.append("file", file)

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    })

    if (!response.ok) {
      let detalhe = `Erro do servidor (${response.status})`
      try {
        const body = await response.json()
        detalhe = body.detail || detalhe
      } catch {

      }
      throw new Error(detalhe)
    }

    const data = await response.json()
    return normalizarResposta(data)
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("A análise demorou mais que o esperado. Verifique sua conexão e tente novamente.")
    }

    if (err.message?.startsWith("Failed to fetch") || err.message?.startsWith("NetworkError")) {
      throw new Error("Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.")
    }

    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}
