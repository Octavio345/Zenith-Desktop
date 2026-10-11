import { Client, handle_file } from "@gradio/client"
import { resolveGradioFileUrl, SPACE_ID } from "./multispectralApi"

const ENDPOINT = "/prepare_capture"
const MAX_FILES = 8
const MAX_TOTAL_BYTES = 1_000_000_000
const REQUEST_TIMEOUT_MS = 15 * 60 * 1000
const BAND_IDS = Object.freeze({
  "green.tif": "green",
  "red.tif": "red",
  "red_edge.tif": "redEdge",
  "nir.tif": "nir",
  "blue.tif": "blue",
  "thermal_celsius.tif": "thermal",
})

function abortError() {
  return new DOMException("Operação cancelada", "AbortError")
}

function parseSummary(value) {
  if (value && typeof value === "object") return value
  if (typeof value === "string") {
    try { return JSON.parse(value) } catch { return null }
  }
  return null
}

export function validateRawCapture(files) {
  if (!Array.isArray(files) || files.length < 4) {
    throw new Error("Selecione pelo menos as quatro bandas ópticas da mesma captura Altum-PT.")
  }
  if (files.length > MAX_FILES) {
    throw new Error("Selecione no máximo 8 TIFFs da mesma captura.")
  }
  if (!files.every((file) => file instanceof File && /\.tiff?$/i.test(file.name))) {
    throw new Error("Use somente arquivos .tif ou .tiff da captura original.")
  }
  if (files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_BYTES) {
    throw new Error("O conjunto ultrapassa 1 GB. Selecione apenas uma captura.")
  }
  const names = files.map((file) => file.name.toLowerCase())
  if (new Set(names).size !== names.length) {
    throw new Error("Há arquivos com nomes repetidos. Revise a seleção.")
  }
}

function normalizeResponse(data) {
  if (!Array.isArray(data) || data.length < 3) {
    throw new Error("O serviço retornou uma resposta incompleta. Tente processar novamente.")
  }
  const summary = parseSummary(data[0])
  const outputFiles = Array.isArray(data[1]) ? data[1] : []
  const names = summary?.bands
  if (!summary || !Array.isArray(names) || outputFiles.length !== names.length) {
    throw new Error("As bandas processadas não foram retornadas corretamente.")
  }
  const bands = {}
  for (let index = 0; index < names.length; index += 1) {
    const name = String(names[index]).toLowerCase()
    const id = BAND_IDS[name]
    const url = resolveGradioFileUrl(outputFiles[index])
    if (!id || !url || bands[id]) {
      throw new Error("Uma banda processada está ausente ou não pode ser baixada.")
    }
    bands[id] = { name, url }
  }
  if (["green", "red", "redEdge", "nir"].some((id) => !bands[id])) {
    throw new Error("O resultado não contém as quatro bandas obrigatórias.")
  }
  const zipUrl = resolveGradioFileUrl(data[2])
  if (!zipUrl) throw new Error("O pacote de download não está disponível.")
  return { summary, bands, zipUrl }
}

function friendlyError(error) {
  if (error?.name === "AbortError") return error
  const message = String(error?.message || error || "")
  if (/api.*(not found|does not exist)|unknown api|invalid api|endpoint.*not found|no function found|404/i.test(message)) {
    return new Error("O serviço de preparo ainda não está disponível. Publique a atualização do Space e tente novamente.")
  }
  if (/timeout/i.test(message)) {
    return new Error("O processamento excedeu o tempo disponível no serviço gratuito. Tente uma captura menor.")
  }
  if (/failed to fetch|network/i.test(message)) {
    return new Error("Não foi possível conectar ao serviço de preparo. Verifique a conexão e o estado do Space.")
  }
  return new Error(message.replace(/^Error:\s*/i, "").replace(/Traceback[\s\S]*/i, "").trim() || "Não foi possível preparar a captura.")
}

export async function prepareMultispectralCapture(files, { signal, onStatus = () => {} } = {}) {
  validateRawCapture(files)
  const reportStatus = (next) => { if (!signal?.aborted) onStatus(next) }
  let submission
  let timeoutId
  let abortHandler
  try {
    reportStatus("connecting")
    const client = await Client.connect(SPACE_ID, {
      events: ["data", "status"],
      record_history: false,
      status_callback: (spaceStatus) => {
        if (["sleeping", "starting", "building"].includes(spaceStatus?.status)) reportStatus("waking")
      },
    })
    if (signal?.aborted) throw abortError()
    reportStatus("uploading")
    submission = client.submit(ENDPOINT, [files.map((file) => handle_file(file))])
    abortHandler = () => submission?.cancel()
    signal?.addEventListener("abort", abortHandler, { once: true })
    const timeout = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => {
        submission?.cancel()
        reject(new Error("timeout"))
      }, REQUEST_TIMEOUT_MS)
    })
    const result = (async () => {
      for await (const event of submission) {
        if (signal?.aborted) throw abortError()
        if (event.type === "status") {
          if (event.stage === "pending") reportStatus("queued")
          if (event.stage === "generating") reportStatus("processing")
          if (event.stage === "error") throw new Error(event.message || "Falha ao processar a captura.")
        }
        if (event.type === "data") {
          reportStatus("finalizing")
          return normalizeResponse(event.data)
        }
      }
      throw new Error("O serviço encerrou a solicitação sem retornar arquivos.")
    })()
    const prepared = await Promise.race([result, timeout])
    if (signal?.aborted) throw abortError()
    return prepared
  } catch (error) {
    throw friendlyError(error)
  } finally {
    window.clearTimeout(timeoutId)
    if (abortHandler) signal?.removeEventListener("abort", abortHandler)
  }
}

export async function downloadPreparedBands(bands, { signal, onStatus = () => {} } = {}) {
  const files = {}
  const entries = Object.entries(bands)
  for (let index = 0; index < entries.length; index += 1) {
    if (signal?.aborted) throw abortError()
    const [id, band] = entries[index]
    onStatus(`Baixando banda ${index + 1} de ${entries.length}`)
    let response
    try {
      response = await fetch(band.url, { signal })
    } catch (error) {
      if (signal?.aborted) throw abortError()
      throw new Error(`Não foi possível baixar ${band.name}. Abra o ZIP ou tente novamente. ${error.message || ""}`)
    }
    if (!response.ok) {
      throw new Error(`Não foi possível baixar ${band.name} (HTTP ${response.status}). Processe novamente se os arquivos tiverem expirado.`)
    }
    const blob = await response.blob()
    files[id] = new File([blob], band.name, { type: "image/tiff" })
  }
  if (signal?.aborted) throw abortError()
  return files
}
