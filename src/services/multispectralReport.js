import { jsPDF } from "jspdf"

const SPACE_ORIGIN = "https://tccamsamericana-zenith-multispectral-api.hf.space"
const COLORS = {
  forest: [21, 63, 42],
  green: [40, 108, 71],
  greenSoft: [232, 244, 230],
  cream: [247, 248, 241],
  ink: [29, 43, 33],
  muted: [104, 118, 109],
  line: [220, 231, 219],
  white: [255, 255, 255],
  amber: [154, 103, 35],
  amberSoft: [255, 249, 233],
}

const BAND_LABELS = {
  green: "Green",
  red: "Red",
  red_edge: "Red Edge",
  nir: "NIR",
  blue: "Blue",
  thermal: "Thermal",
}

const clean = (value) => String(value ?? "")
  .replace(/[\u0000-\u001f]/g, " ")
  .replace(/[–—]/g, "-")
  .trim()

const present = (value) => value !== undefined && value !== null && value !== ""

function number(value, options = {}) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return "-"
  return parsed.toLocaleString("pt-BR", options)
}

function percent(value) {
  return `${number(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
}

function normalizeAssetUrl(src) {
  if (!src || typeof src !== "string") throw new Error("Um arquivo visual do relatório não está disponível.")
  const base = globalThis.window?.location?.href || "http://localhost/"
  const url = new URL(src, base)

  if (["data:", "blob:"].includes(url.protocol)) return url.href
  const localOrigin = globalThis.window?.location?.origin
  if (url.origin !== SPACE_ORIGIN && (!localOrigin || url.origin !== localOrigin)) {
    throw new Error("A origem de uma imagem do relatório não é permitida.")
  }

  return url.href
}

function imageFormat(contentType, url) {
  const type = String(contentType || "").toLowerCase()
  if (type.includes("png") || /\.png(?:$|\?)/i.test(url)) return "PNG"
  if (type.includes("webp") || /\.webp(?:$|\?)/i.test(url)) return "WEBP"
  return "JPEG"
}

async function flattenForPdf(bytes, contentType) {
  if (!globalThis.document || !globalThis.Image || !globalThis.URL?.createObjectURL) return null

  const objectUrl = URL.createObjectURL(new Blob([bytes], { type: contentType || "image/png" }))
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = reject
      element.src = objectUrl
    })
    const longestSide = Math.max(image.naturalWidth, image.naturalHeight)
    const scale = Math.min(1, 2200 / longestSide)
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext("2d", { alpha: false })
    if (!context) return null
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92))
    if (!blob) return null
    return { bytes: new Uint8Array(await blob.arrayBuffer()), format: "JPEG" }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function loadAsset(src, { flatten = false } = {}) {
  const url = normalizeAssetUrl(src)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25_000)

  try {
    const response = await fetch(url, { signal: controller.signal, credentials: "omit" })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const contentType = response.headers.get("content-type")
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (flatten) {
      const flattened = await flattenForPdf(bytes, contentType)
      if (flattened) return flattened
    }
    return { bytes, format: imageFormat(contentType, url) }
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("Tempo excedido ao carregar os mapas do relatório.")
    throw new Error("Não foi possível carregar um dos mapas para o relatório. Tente gerar novamente enquanto o resultado estiver aberto.")
  } finally {
    clearTimeout(timer)
  }
}

function fitImage(doc, asset, x, y, width, height) {
  const properties = doc.getImageProperties(asset.bytes)
  const scale = Math.min(width / properties.width, height / properties.height)
  const drawWidth = properties.width * scale
  const drawHeight = properties.height * scale
  // Isolate the image transformation/clipping state. Without this guard, some
  // PNG decoders can leave a clip active and hide parts of headers or footers.
  doc.saveGraphicsState()
  doc.addImage(asset.bytes, asset.format, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight, undefined, "FAST")
  doc.restoreGraphicsState()
}

export async function createMultispectralReport({
  result,
  context = {},
}) {
  const summary = result?.summary
  const files = result?.files
  if (!summary || summary.status !== "success" || !files?.overlay) {
    throw new Error("Não existem resultados multiespectrais válidos para gerar o relatório.")
  }

  const [overlay, stressScore, ndviMap, ndreMap, priorityMap] = await Promise.all([
    // The main map is flattened to JPEG because large transparent PNGs can
    // leave an invalid clipping state in some PDF viewers.
    loadAsset(files.overlay, { flatten: true }),
    files.stressScore ? loadAsset(files.stressScore) : null,
    files.ndvi ? loadAsset(files.ndvi) : null,
    files.ndre ? loadAsset(files.ndre) : null,
    files.priority ? loadAsset(files.priority) : null,
  ])

  const input = summary.input || {}
  const processing = summary.processing || {}
  const vegetation = summary.vegetation || {}
  const stress = summary.stress_analysis || {}
  const thermal = summary.thermal_analysis || {}
  const indices = summary.indices || {}
  const generatedAt = new Date()
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true })

  doc.setProperties({
    title: "Relatório de Análise Multiespectral",
    author: context.userName || "Zenith",
    subject: "Triagem de possível estresse fisiológico em vegetação",
    keywords: "Zenith, multiespectral, NDVI, NDRE, agricultura",
  })

  function setColor(type, color) {
    const method = type === "fill" ? "setFillColor" : type === "draw" ? "setDrawColor" : "setTextColor"
    doc[method](...color)
  }

  function pageHeader(sectionLabel, paintBackground = true) {
    if (paintBackground) {
      setColor("fill", COLORS.cream)
      doc.rect(0, 0, 210, 297, "F")
    } else {
      setColor("fill", COLORS.cream)
      doc.rect(0, 0, 210, 35, "F")
    }
    setColor("fill", COLORS.green)
    doc.rect(0, 0, 210, 3, "F")
    setColor("fill", COLORS.white)
    doc.roundedRect(14, 9, 182, 22, 3, 3, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    setColor("text", COLORS.forest)
    const pageTag = String(doc.getNumberOfPages()).padStart(2, "0")
    doc.text(`ZENITH / ${pageTag}`, 105, 18, { align: "center" })
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    setColor("text", COLORS.muted)
    doc.text("Sua precisão agrícola no ponto mais alto", 105, 24, { align: "center" })
    doc.setFont("helvetica", "bold")
    doc.setFontSize(7)
    setColor("text", COLORS.green)
    doc.text(clean(sectionLabel).toUpperCase(), 190, 20, { align: "right" })
  }

  function newPage(sectionLabel) {
    if (doc.getNumberOfPages() > 0) doc.addPage()
    pageHeader(sectionLabel)
  }

  function heading(kicker, title, description, y = 43) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(7.5)
    setColor("text", COLORS.green)
    doc.text(clean(kicker).toUpperCase(), 16, y)
    doc.setFontSize(21)
    setColor("text", COLORS.forest)
    doc.text(clean(title), 16, y + 10)
    if (description) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8.5)
      setColor("text", COLORS.muted)
      doc.text(doc.splitTextToSize(clean(description), 178), 16, y + 18)
    }
  }

  function labelValue(label, value, x, y, width = 54) {
    setColor("fill", COLORS.white)
    setColor("draw", COLORS.line)
    doc.roundedRect(x, y, width, 24, 3, 3, "FD")
    doc.setFont("helvetica", "normal")
    doc.setFontSize(6.5)
    setColor("text", COLORS.muted)
    doc.text(clean(label), x + 5, y + 8)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    setColor("text", COLORS.forest)
    const lines = doc.splitTextToSize(clean(value), width - 10)
    doc.text(lines.slice(0, 2), x + 5, y + 16)
  }

  function paragraph(value, x, y, width, options = {}) {
    doc.setFont("helvetica", options.bold ? "bold" : "normal")
    doc.setFontSize(options.size || 8.5)
    setColor("text", options.color || COLORS.muted)
    const lines = doc.splitTextToSize(clean(value), width)
    doc.text(lines, x, y)
    return y + lines.length * ((options.size || 8.5) * 0.42)
  }

  function mapCard(asset, title, description, x, y, width, height) {
    setColor("fill", COLORS.white)
    setColor("draw", COLORS.line)
    doc.roundedRect(x, y, width, height, 4, 4, "FD")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    setColor("text", COLORS.forest)
    doc.text(clean(title), x + 5, y + 8)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(6.5)
    setColor("text", COLORS.muted)
    doc.text(doc.splitTextToSize(clean(description), width - 10).slice(0, 2), x + 5, y + 13)
    setColor("fill", [239, 244, 237])
    doc.roundedRect(x + 4, y + 22, width - 8, height - 27, 2, 2, "F")
    if (asset) fitImage(doc, asset, x + 5, y + 23, width - 10, height - 29)
    else {
      doc.setFontSize(8)
      doc.text("Visualização não disponível", x + width / 2, y + height / 2, { align: "center" })
    }
  }

  function indexRow(label, title, stats, y) {
    setColor("fill", COLORS.white)
    setColor("draw", COLORS.line)
    doc.roundedRect(16, y, 178, 19, 2.5, 2.5, "FD")
    setColor("fill", COLORS.greenSoft)
    doc.roundedRect(20, y + 4, 22, 11, 2, 2, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    setColor("text", COLORS.green)
    doc.text(label, 31, y + 11, { align: "center" })
    doc.setFontSize(7.5)
    setColor("text", COLORS.forest)
    doc.text(clean(title), 47, y + 8)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(6.5)
    setColor("text", COLORS.muted)
    doc.text(`Mín. ${number(stats?.minimum, { maximumFractionDigits: 4 })}`, 47, y + 14)
    doc.text(`Máx. ${number(stats?.maximum, { maximumFractionDigits: 4 })}`, 82, y + 14)
    doc.text(`Média ${number(stats?.mean, { maximumFractionDigits: 4 })}`, 118, y + 14)
    doc.text(`Mediana ${number(stats?.median, { maximumFractionDigits: 4 })}`, 157, y + 14)
  }

  pageHeader("Análise multiespectral")
  heading("Relatório técnico", "Análise multiespectral", "Triagem de possível estresse fisiológico baseada no padrão predominante da própria cena.")

  setColor("fill", COLORS.forest)
  doc.roundedRect(16, 72, 178, 54, 5, 5, "F")
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  setColor("text", [194, 224, 201])
  doc.text("VEGETAÇÃO COM RESPOSTA MULTIESPECTRAL DIFERENTE", 23, 84)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(29)
  setColor("text", COLORS.white)
  doc.text(percent(stress.spectral_anomaly_percentage), 23, 102)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  setColor("text", [220, 235, 224])
  doc.text(doc.splitTextToSize("Percentual dos pixels considerados vegetação que apresentaram comportamento anômalo em relação ao padrão da área.", 105), 23, 111)
  setColor("fill", [49, 83, 62])
  doc.roundedRect(142, 81, 44, 36, 3, 3, "F")
  doc.setFontSize(6.5)
  setColor("text", [194, 224, 201])
  doc.text("PIXELS DE VEGETAÇÃO", 148, 91)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  setColor("text", COLORS.white)
  doc.text(number(vegetation.pixel_count), 148, 102)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(6.5)
  doc.text(`${percent(stress.priority_area_percentage)} prioritários`, 148, 111)

  labelValue("Data de emissão", generatedAt.toLocaleDateString("pt-BR"), 16, 134, 55)
  labelValue("Identificador", summary.job_id || context.id || "Não informado", 77, 134, 56)
  labelValue("Imagem térmica", thermal.available ? "Analisada" : input.thermal_available ? "Sem dados suficientes" : "Não fornecida", 139, 134, 55)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  setColor("text", COLORS.forest)
  doc.text("Leitura executiva", 16, 173)
  paragraph(
    "As áreas sinalizadas apresentam resposta multiespectral diferente do padrão predominante da vegetação. O resultado ajuda a priorizar a inspeção em campo, mas não identifica isoladamente doença, praga, deficiência nutricional ou estresse hídrico.",
    16, 181, 178,
  )

  setColor("fill", COLORS.white)
  setColor("draw", COLORS.line)
  doc.roundedRect(16, 205, 178, 44, 4, 4, "FD")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  setColor("text", COLORS.green)
  doc.text("IDENTIFICAÇÃO", 22, 215)
  const identification = [
    context.farmName ? `Propriedade: ${context.farmName}` : null,
    context.fieldAreaName ? `Talhão: ${context.fieldAreaName}` : null,
    context.userName ? `Emitido por: ${context.userName}` : null,
    context.userDocument ? `${context.documentLabel || "Documento"}: ${context.userDocument}` : null,
    context.analyzedAt ? `Data da análise: ${context.analyzedAt}` : null,
  ].filter(Boolean)
  paragraph(identification.length ? identification.join("  |  ") : "Dados de propriedade e talhão não informados para esta análise.", 22, 224, 166, { size: 8 })

  setColor("fill", COLORS.amberSoft)
  setColor("draw", [232, 217, 164])
  doc.roundedRect(16, 257, 178, 20, 3, 3, "FD")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  setColor("text", COLORS.amber)
  doc.text("IMPORTANTE", 22, 265)
  paragraph("Este relatório representa triagem agronômica. Confirme as áreas prioritárias por inspeção presencial antes de qualquer intervenção.", 22, 270, 166, { size: 7, color: [112, 89, 32] })

  newPage("Mapa principal")
  heading("Visão geral", "Mapa de possíveis alterações fisiológicas", "As regiões destacadas apresentaram resposta multiespectral diferente do padrão predominante da vegetação.")
  setColor("fill", COLORS.white)
  setColor("draw", COLORS.line)
  doc.roundedRect(16, 68, 178, 168, 4, 4, "FD")
  setColor("fill", [239, 244, 237])
  doc.roundedRect(20, 72, 170, 160, 3, 3, "F")
  fitImage(doc, overlay, 21, 73, 168, 158)
  setColor("fill", COLORS.greenSoft)
  doc.roundedRect(16, 244, 178, 27, 3, 3, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  setColor("text", COLORS.green)
  doc.text("COMO USAR ESTE MAPA", 22, 253)
  paragraph("Use as regiões destacadas para planejar o caminhamento e a amostragem em campo. A marcação indica diferença espectral, não uma causa confirmada.", 22, 260, 166, { size: 7.5 })
  newPage("Mapas complementares")
  heading("Evidências visuais", "Mapas da análise", "Compare intensidade espectral, índices de vegetação e áreas prioritárias sem interpretar qualquer mapa isoladamente como diagnóstico.")
  mapCard(stressScore, "Resposta espectral", "Intensidade relativa da diferença identificada pelo modelo.", 16, 69, 86, 91)
  mapCard(priorityMap, "Áreas prioritárias", thermal.available ? "Coincidência entre anomalia espectral e térmica." : "Prioridade baseada na análise espectral.", 108, 69, 86, 91)
  mapCard(ndviMap, "NDVI", "Resposta combinada das bandas Red e NIR.", 16, 167, 86, 91)
  mapCard(ndreMap, "NDRE", "Resposta de Red Edge e NIR, sensível a variações do dossel.", 108, 167, 86, 91)

  newPage("Indicadores e metodologia")
  heading("Detalhes da análise", "Indicadores técnicos", "Estatísticas calculadas exclusivamente sobre os pixels considerados vegetação.")
  indexRow("NDVI", "Vigor e cobertura", indices.ndvi, 68)
  indexRow("NDRE", "Resposta do dossel", indices.ndre, 91)
  indexRow("GNDVI", "Resposta à banda verde", indices.gndvi, 114)
  indexRow("CIre", "Índice de clorofila Red Edge", indices.cire, 137)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  setColor("text", COLORS.forest)
  doc.text("Informações técnicas", 16, 169)
  const bands = Array.isArray(input.bands_received)
    ? input.bands_received.map((band) => BAND_LABELS[band] || band).join(", ")
    : "Não informado"
  const technicalRows = [
    ["Bandas utilizadas", bands],
    ["Dimensões", input.width && input.height ? `${number(input.width)} x ${number(input.height)} pixels` : "Não informado"],
    ["Georreferenciamento", input.crs || "Não disponível"],
    ["Escala de reflectância", number(input.reflectance_scale)],
    ["NDVI mínimo para vegetação", number(vegetation.ndvi_threshold, { maximumFractionDigits: 2 })],
    ["Método", stress.method || "RobustScaler + IsolationForest + filtragem espacial"],
  ]
  technicalRows.forEach(([label, value], index) => {
    const y = 177 + index * 10
    if (index % 2 === 0) { setColor("fill", [242, 247, 239]); doc.rect(16, y - 6, 178, 10, "F") }
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); setColor("text", COLORS.forest); doc.text(label, 20, y)
    doc.setFont("helvetica", "normal"); setColor("text", COLORS.muted)
    doc.text(doc.splitTextToSize(clean(value), 112).slice(0, 1), 78, y)
  })

  if (present(processing.radiometric_note)) {
    setColor("fill", COLORS.amberSoft)
    setColor("draw", [232, 217, 164])
    doc.roundedRect(16, 240, 178, 24, 3, 3, "FD")
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); setColor("text", COLORS.amber); doc.text("NOTA DE CALIBRAÇÃO", 22, 248)
    paragraph(processing.radiometric_note, 22, 254, 166, { size: 7, color: [112, 89, 32] })
  }

  doc.addPage()
  pageHeader("Inspeção em campo")
  heading("Próxima etapa", "Registro da vistoria", "Preencha após verificar presencialmente as áreas sinalizadas no levantamento.")
  const checks = ["Alteração confirmada em campo", "Alteração não confirmada", "Outra condição observada", "Nova coleta recomendada"]
  checks.forEach((label, index) => {
    const y = 78 + index * 13
    setColor("draw", COLORS.green)
    doc.rect(18, y - 4, 4, 4)
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); setColor("text", COLORS.ink); doc.text(label, 28, y)
  })
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); setColor("text", COLORS.forest); doc.text("Áreas / pontos verificados", 16, 139)
  for (let index = 0; index < 3; index += 1) { setColor("draw", COLORS.line); doc.line(16, 150 + index * 12, 194, 150 + index * 12) }
  doc.text("Observações de campo", 16, 194)
  for (let index = 0; index < 5; index += 1) { setColor("draw", COLORS.line); doc.line(16, 205 + index * 12, 194, 205 + index * 12) }
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); setColor("text", COLORS.ink)
  doc.text("Responsável: ______________________________________________", 16, 270)
  doc.text("Data: ____ / ____ / ________", 140, 270)

  const totalPages = doc.getNumberOfPages()
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    doc.setPage(pageNumber)
    setColor("draw", COLORS.line)
    doc.line(16, 283, 194, 283)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(6.5)
    setColor("text", COLORS.muted)
    doc.text("ZENITH | Relatório gerado automaticamente pela plataforma Zenith.", 16, 289)
    doc.text(`Página ${pageNumber} de ${totalPages}`, 194, 289, { align: "right" })
  }

  const pad = (value) => String(value).padStart(2, "0")
  const stamp = `${generatedAt.getFullYear()}-${pad(generatedAt.getMonth() + 1)}-${pad(generatedAt.getDate())}_${pad(generatedAt.getHours())}${pad(generatedAt.getMinutes())}`
  return { doc, filename: `Zenith_Analise_Multiespectral_${stamp}.pdf` }
}
