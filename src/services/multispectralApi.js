import { Client, handle_file } from "@gradio/client"

const SPACE_ID = "TccAmsAmericana/zenith-multispectral-api"
const SPACE_URL = "https://tccamsamericana-zenith-multispectral-api.hf.space"
const ENDPOINT = "/analyze_stress"
const REQUEST_TIMEOUT_MS = 10 * 60 * 1000

export const MULTISPECTRAL_DEFAULTS = Object.freeze({
  reflectanceScale: 255,
  vegetationNdviMin: 0.2,
  thermalUnit: "celsius",
  thermalZThreshold: 2.5,
  minimumClusterPixels: 25,
  assumeAligned: true,
})

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

export function resolveGradioFileUrl(file) {
  if (!file) return null
  if (Array.isArray(file)) return resolveGradioFileUrl(file[0])

  if (typeof file === "object") {
    return resolveGradioFileUrl(
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

function normalizeResponse(data) {
  if (!Array.isArray(data) || data.length < 7) {
    throw new Error("A análise terminou, mas o servidor retornou uma resposta incompleta.")
  }

  const summary = parseResult(data[0])
  const files = {
    overlay: resolveGradioFileUrl(data[1]),
    stressScore: resolveGradioFileUrl(data[2]),
    ndvi: resolveGradioFileUrl(data[3]),
    ndre: resolveGradioFileUrl(data[4]),
    priority: resolveGradioFileUrl(data[5]),
    download: resolveGradioFileUrl(data[6]),
  }

  if (!summary || summary.status !== "success" || !files.overlay) {
    throw new Error("O servidor não retornou os dados esperados para esta análise.")
  }

  return { summary, files }
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
      `O serviço de processamento atingiu o limite temporário de GPU do provedor.${retryText} Seus arquivos não apresentam problema.`,
    )
  }

  if (lowerMessage.includes("aborted") || lowerMessage.includes("cancel")) {
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

  return new Error(cleanMessage || "Não foi possível concluir a análise multiespectral.")
}

function requiredFilesAreValid(files) {
  return [files?.green, files?.red, files?.redEdge, files?.nir]
    .every((file) => file instanceof File)
}

export async function analyzeMultispectral(files, options = {}) {
  if (!requiredFilesAreValid(files)) {
    throw new Error("Adicione as bandas Green, Red, Red Edge e NIR para iniciar a análise.")
  }

  const { signal, onStatus = () => {} } = options
  let submission = null
  let timeoutId = null
  let abortHandler = null

  try {
    onStatus("connecting")
    const client = await Client.connect(SPACE_ID, {
      events: ["data", "status"],
      record_history: false,
      status_callback: (spaceStatus) => {
        if (["sleeping", "starting", "building"].includes(spaceStatus?.status)) {
          onStatus("waking")
        }
        if (["space_error", "paused", "error", "stopped"].includes(spaceStatus?.status)) {
          onStatus("unavailable")
        }
      },
    })

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError")

    onStatus("uploading")
    const payload = [
      handle_file(files.green),
      handle_file(files.red),
      handle_file(files.redEdge),
      handle_file(files.nir),
      files.blue ? handle_file(files.blue) : null,
      files.thermal ? handle_file(files.thermal) : null,
      MULTISPECTRAL_DEFAULTS.reflectanceScale,
      MULTISPECTRAL_DEFAULTS.vegetationNdviMin,
      MULTISPECTRAL_DEFAULTS.thermalUnit,
      MULTISPECTRAL_DEFAULTS.thermalZThreshold,
      MULTISPECTRAL_DEFAULTS.minimumClusterPixels,
      MULTISPECTRAL_DEFAULTS.assumeAligned,
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
          if (event.stage === "error") throw new Error(event.message || "Falha no processamento multiespectral.")
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

export { SPACE_ID }
