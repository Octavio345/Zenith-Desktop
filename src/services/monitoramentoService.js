const API_URL =
  import.meta.env?.VITE_MONITORAMENTO_API_URL ||
  "https://tccamsamericana-monitoramento-plantacao.hf.space/analyze"

const TIMEOUT_MS = 40000
const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "image/avif"]
const MAX_TAMANHO_MB = 30

export async function arquivoEhAvif(file) {
  if (file.type === "image/avif") return true
  if (!file.slice) return false

  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer())
  if (bytes.length < 12 || String.fromCharCode(...bytes.slice(4, 8)) !== "ftyp") return false

  for (let offset = 8; offset + 4 <= bytes.length; offset += 4) {
    const brand = String.fromCharCode(...bytes.slice(offset, offset + 4))
    if (brand === "avif" || brand === "avis") return true
  }
  return false
}

function converterAvifParaJpeg(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    const liberar = () => URL.revokeObjectURL(url)

    image.onerror = () => {
      liberar()
      reject(new Error("Não foi possível abrir esta imagem AVIF. Exporte-a como JPG ou PNG e tente novamente."))
    }
    image.onload = () => {
      liberar()
      const scale = Math.min(1, 4096 / Math.max(image.naturalWidth, image.naturalHeight))
      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
      const context = canvas.getContext("2d")
      if (!context) {
        reject(new Error("Não foi possível preparar a imagem. Tente exportá-la como JPG ou PNG."))
        return
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (!blob || blob.type !== "image/jpeg") {
          reject(new Error("Não foi possível converter a imagem AVIF. Exporte-a como JPG ou PNG."))
          return
        }
        const name = `${file.name.replace(/\.[^.]+$/, "")}.jpg`
        resolve(new File([blob], name, { type: "image/jpeg" }))
      }, "image/jpeg", 0.92)
    }
    image.src = url
  })
}

async function prepararArquivo(file) {
  if (!(await arquivoEhAvif(file))) return file
  const jpeg = await converterAvifParaJpeg(file)
  const erro = validarArquivo(jpeg)
  if (erro) throw new Error(erro)
  return jpeg
}

export function validarArquivo(file) {
  if (!file) return "Nenhum arquivo selecionado."

  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    return "Formato não aceito. Use JPG, PNG, WebP ou AVIF."
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
  const arquivoParaEnvio = await prepararArquivo(file)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  const formData = new FormData()
  formData.append("file", arquivoParaEnvio)

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
