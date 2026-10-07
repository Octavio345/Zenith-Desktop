import { jsPDF } from "jspdf"

const GREEN = [38, 99, 65]
const DISCLAIMER = "Os resultados apresentados constituem apoio tecnológico à inspeção agrícola e devem ser interpretados em conjunto com avaliação de campo."
const names = { soja_saudavel: "Soja saudável", doenca_de_ferrugem_soja: "Ferrugem da soja", doenca_ferrugem_soja: "Ferrugem da soja", ataque_de_largata_soja: "Ataque de lagarta na soja", ataque_de_lagarta_soja: "Ataque de lagarta na soja", cercospora: "Cercosporiose da soja", healthy: "Trigo saudável", septoria: "Septoriose do trigo", stripe_rust: "Ferrugem amarela do trigo" }
const statuses = { ok: "Análise concluída", baixa_confianca: "Baixa confiança", baixa_qualidade: "Qualidade insuficiente", fora_do_dominio: "Imagem fora do padrão esperado", classes_proximas: "Classes próximas - resultado inconclusivo", consenso_insuficiente: "Consenso insuficiente", sem_imagens_analisaveis: "Sem imagens analisáveis", heterogeneo: "Conjunto com diferentes condições", imagem_invalida: "Imagem inválida", erro_api: "Erro no serviço de análise", erro_conexao: "Erro de conexão", erro_processamento: "Erro de processamento" }
const readable = (v) => names[v] || String(v ?? "").replace(/_/g, " ")
const present = (v) => v !== undefined && v !== null && v !== ""
const numeric = (v) => present(v) && Number.isFinite(Number(v))
const percent = (v, scale = 1) => numeric(v) ? `${(Number(v) * scale).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : null
const clean = (v) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").replace(/[–—]/g, "-")

// Decode only local assets and image previews; no analysis is sent to a PDF service.
async function loadImage(src, maxSize = 1800) {
  if (!src) return null
  const url = new URL(src, window.location.href)
  if (!["blob:", "data:"].includes(url.protocol) && url.origin !== window.location.origin) throw new Error("A imagem do relatório precisa estar disponível localmente.")
  const image = new Image()
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Tempo excedido ao carregar uma imagem. Tente gerar o relatório novamente.")), 15000)
    image.onload = () => { clearTimeout(timer); resolve() }
    image.onerror = () => { clearTimeout(timer); reject(new Error("Não foi possível carregar uma imagem do relatório. Tente novamente.")) }
    image.src = src
  })
  const ratio = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(image.naturalWidth * ratio)
  canvas.height = Math.round(image.naturalHeight * ratio)
  const ctx = canvas.getContext("2d")
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  return { data: canvas.toDataURL("image/jpeg", .9), width: canvas.width, height: canvas.height }
}

export async function createAnalysisReport({ kind, result, images = [], context = {}, logoSrc = "/assets/image/Logo-redonda.webp" }) {
  const caneAnalysis = kind === "cana"
  const monitor = kind === "monitoramento" || caneAnalysis
  const cultura = result?.cultura || result?.resultado_geral?.cultura || context.cultura || "soja"
  const cultureLabel = cultura === "trigo" ? "Trigo" : "Soja"
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true })
  const generated = new Date()
  const logo = await loadImage(logoSrc)
  const title = caneAnalysis
    ? "Relatório de Análise da Cana-de-Açúcar"
    : monitor
      ? "Relatório de Monitoramento da Plantação"
      : "Relatório de Triagem Fitossanitária"
  doc.setProperties({ title, author: context.userName || "Zenith", subject: "Análise computacional e confirmação em campo" })
  let y = 46
  function header() {
    doc.setFillColor(...GREEN); doc.rect(0, 0, 210, 3, "F")
    doc.addImage(logo.data, "JPEG", 16, 10, 18, 18)
    doc.setTextColor(...GREEN); doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.text("ZENITH", 39, 18)
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text("Sua precisão agrícola no ponto mais alto", 39, 25)
    doc.setFontSize(8); doc.setTextColor(100, 119, 106); doc.text("REGISTRO TÉCNICO | AGRICULTURA", 194, 17, { align: "right" })
    doc.setDrawColor(215, 227, 217); doc.line(16, 34, 194, 34)
    y = 43
  }
  function page() { doc.addPage(); header() }
  function reserve(h) { if (y + h > 265) page() }
  function text(value, size = 10, bold = false) {
    doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size)
    const lines = doc.splitTextToSize(clean(value), 178)
    for (const line of lines) {
      reserve(size * .48 + 1)
      doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size)
      doc.setTextColor(40, 58, 46); doc.text(line, 16, y); y += size * .48 + 1
    }
    y += 2
  }
  function section(label) {
    reserve(30); y += 4
    doc.setFillColor(...GREEN); doc.rect(16, y - 3, 1.2, 5, "F")
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...GREEN)
    doc.text(clean(label), 20, y); y += 10
  }
  function field(label, value) { if (present(value)) text(`${label}: ${value}`) }
  async function picture(src, caption) {
    if (!src) return
    const image = await loadImage(src)
    const h = Math.min(94, 178 * image.height / image.width)
    const w = Math.min(178, h * image.width / image.height)
    reserve(h + 19)
    doc.addImage(image.data, "JPEG", 16 + (178 - w) / 2, y, w, h)
    y += h + 5; text(caption, 8)
  }
  function inspection() {
    page(); text("Confirmação em campo", 21, true)
    text("PREENCHIMENTO MANUAL APÓS A VISTORIA", 8, true)
    text("Use os números das imagens deste relatório para relacionar as observações com a área inspecionada.", 10)
    text("Confirme as observações presencialmente antes de qualquer decisão de manejo. Procure um profissional qualificado quando necessário.", 9)
    section("Registro da vistoria")
    for (const label of ["Ocorrência confirmada", "Ocorrência não confirmada", "Outra condição identificada", "Aguardando vistoria"]) {
      doc.setDrawColor(105, 125, 109); doc.rect(16, y - 3, 3.5, 3.5)
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(label, 23, y); y += 9
    }
    y += 7; text("Imagens / áreas verificadas: ______________________________________________", 10)
    section("Observações de campo")
    for (let i = 0; i < 5; i++) { doc.setDrawColor(207, 218, 209); doc.line(16, y + 6, 194, y + 6); y += 12 }
    y += 9
    text("Responsável pela vistoria: _______________________________________________", 10)
    text("Data da vistoria: ____ / ____ / ________     Horário: ____ : ____", 10)
    y += 13; doc.line(32, y, 178, y); y += 6
    doc.setFontSize(9); doc.text("Assinatura do responsável pela vistoria", 105, y, { align: "center" })
  }
  async function imageGrid(items) {
    const pools = new Map()
    images.forEach(image => { const key = image.file?.name || image.name; if (!pools.has(key)) pools.set(key, []); pools.get(key).push(image) })
    if (!items.length) {
      text("Este registro não contém resultados individuais de imagens.", 9)
      return
    }
    for (let start = 0; start < items.length; start += 6) {
      const count = Math.min(6, items.length - start)
      const columns = count <= 2 ? 1 : 2
      const rows = Math.ceil(count / columns)
      const cardWidth = columns === 1 ? 178 : 86
      const cardHeight = rows === 1 ? 164 : rows === 2 ? 96 : 63
      const photoHeight = cardHeight - 28
      page(); text("Registro visual da análise", 18, true)
      text(`Imagens ${start + 1} a ${Math.min(start + 6, items.length)} de ${items.length} | Resultado individual`, 9)
      const top = y + 2
      for (let offset = 0; offset < count; offset++) {
        const item = items[start + offset]
        const x = 16 + (offset % columns) * 92
        const cy = top + Math.floor(offset / columns) * (cardHeight + 4)
        doc.setDrawColor(218, 228, 220); doc.setFillColor(248, 250, 248)
        doc.roundedRect(x, cy, cardWidth, cardHeight, 2, 2, "FD")
        const image = pools.get(item.arquivo)?.shift()
        const src = image?.preview
        if (src) {
          const img = await loadImage(src, columns === 1 ? 1400 : 900)
          const scale = Math.min((cardWidth - 8) / img.width, photoHeight / img.height)
          doc.addImage(img.data, "JPEG", x + (cardWidth - img.width * scale) / 2, cy + 4 + (photoHeight - img.height * scale) / 2, img.width * scale, img.height * scale)
        } else {
          doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(105, 120, 109)
          doc.text("Imagem indisponível", x + cardWidth / 2, cy + photoHeight / 2, { align: "center" })
        }
        doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...GREEN)
        doc.text(`IMAGEM ${String(start + offset + 1).padStart(3, "0")}`, x + 4, cy + photoHeight + 9)
        const label = item.status === "ok" ? readable(item.resultado || item.doenca || item.disease) : statuses[item.status] || readable(item.status || "Inconclusivo")
        doc.setFont("helvetica", "normal"); doc.setFontSize(8)
        const lines = doc.splitTextToSize(clean(label), cardWidth - 8)
        doc.text(lines.slice(0, 2), x + 4, cy + photoHeight + 14)
        const confidence = percent(item.confianca ?? item.confidence)
        if (item.status === "ok" && confidence) doc.text(`Confiança: ${confidence}`, x + 4, cy + photoHeight + 24)
      }
      y = top + rows * (cardHeight + 4)
    }
  }
  function screening(data, batch = false) {
    const status = data.status || "não informado"
    field("Status da análise", statuses[status] || readable(status))
    if (status === "ok") {
      const classification = readable(data.condicao_predominante || data.resultado || data.doenca || data.disease)
      doc.setFont("helvetica", "normal"); doc.setFontSize(10)
      const cardHeight = doc.splitTextToSize(clean(`Classe mais provável: ${classification}`), 178).length * 5.8 + 18
      reserve(cardHeight + 8)
      const cardTop = y
      doc.setFillColor(238, 245, 238); doc.roundedRect(14, y - 5, 182, cardHeight, 2, 2, "F")
      field("Classe mais provável", classification)
      field(batch ? "Confiança média do modelo" : "Confiança do modelo", percent(data.confianca_media ?? data.confianca ?? data.confidence))
      y = Math.max(y, cardTop + cardHeight + 2)
      text(/saud[aá]vel/i.test(classification)
        ? `As características visuais foram classificadas como ${cultureLabel.toLowerCase()} saudável. Isso não garante ausência de problemas; mantenha o acompanhamento e a avaliação de campo.`
        : "A análise computacional identificou características visuais compatíveis com a classe apresentada. O resultado apoia a inspeção e não constitui diagnóstico agronômico definitivo.")
    } else if (status === "heterogeneo") {
      reserve(34)
      const cardTop = y
      doc.setFillColor(253, 247, 231); doc.roundedRect(14, cardTop - 5, 182, 29, 2, 2, "F")
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(126, 79, 18)
      doc.text("MAIS DE UMA CONDIÇÃO ENCONTRADA", 20, cardTop + 3)
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(64, 67, 58)
      const lines = doc.splitTextToSize("As imagens apresentam resultados diferentes. Veja abaixo quantas imagens indicaram cada condição.", 166)
      doc.text(lines, 20, cardTop + 10)
      y = cardTop + 29
    } else {
      text("RESULTADO INCONCLUSIVO OU ANÁLISE NÃO CONCLUÍDA", 11, true)
      text("Uma nova imagem ou inspeção presencial pode ser necessária. Este resultado não confirma uma ocorrência.")
    }
    field("Aviso do processamento", data.mensagem || data.message)
    const probabilities = batch ? data.probabilidades_medias : data.probabilidades || data.probabilities
    if (probabilities && Object.keys(probabilities).length) {
      section(batch ? "Probabilidades médias retornadas" : "Probabilidades retornadas")
      for (const [name, value] of Object.entries(probabilities)) field(readable(name), percent(value))
    }
  }
  function conditionSummary(items = []) {
    const conditions = items.filter(item => item?.classe)
    if (conditions.length < 2) return
    const blockHeight = 36 + conditions.length * 23
    if (blockHeight <= 220) reserve(blockHeight)
    section("Condições encontradas nas imagens")
    text("Cada linha mostra uma condição indicada e quantas imagens com resultado confiável apresentaram esse sinal. Condições diferentes podem estar em plantas ou pontos distintos do talhão.", 9)
    conditions.forEach((item, index) => {
      reserve(24)
      const healthy = /saud[aá]vel/i.test(readable(item.classe))
      const top = y - 3
      doc.setFillColor(...(healthy ? [238, 246, 239] : [253, 247, 231]))
      doc.setDrawColor(...(healthy ? [198, 222, 202] : [235, 215, 172]))
      doc.roundedRect(14, top, 182, 19, 2, 2, "FD")
      doc.setFillColor(...(healthy ? GREEN : [173, 112, 32])); doc.circle(23, top + 9.5, 4.2, "F")
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(255, 255, 255)
      doc.text(String(index + 1), 23, top + 10.5, { align: "center" })
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(40, 58, 46)
      doc.text(clean(readable(item.classe)), 31, top + 8)
      const details = []
      if (present(item.imagens_confiaveis)) details.push(`${item.imagens_confiaveis} ${Number(item.imagens_confiaveis) === 1 ? "imagem" : "imagens"}`)
      const share = percent(item.percentual_das_confiaveis)
      if (share) details.push(`${share} dos resultados confiáveis`)
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(92, 106, 96)
      if (details.length) doc.text(clean(details.join(" | ")), 31, top + 14)
      y = top + 23
    })
  }
  header(); text(caneAnalysis ? "Análise da cana-de-açúcar" : monitor ? "Monitoramento da plantação" : `Análise da saúde ${cultura === "trigo" ? "do trigo" : "da soja"}`, 23, true)
  text(monitor ? "RELATÓRIO DE ANÁLISE | ZENITH" : "RELATÓRIO DE TRIAGEM FITOSSANITÁRIA | ZENITH", 8, true)
  field("Gerado em", generated.toLocaleString("pt-BR"))
  if (!monitor) field("Cultura analisada", cultureLabel)
  field("Data da análise", context.analyzedAt)
  field("Identificador", context.id)
  if (context.farmName || context.fieldAreaName || context.userName || context.userDocument) {
    section("Identificação")
    field("Propriedade", context.farmName); field("Talhão", context.fieldAreaName); field("Emitido por", context.userName); field(context.documentLabel || "Documento", context.userDocument)
  }
  if (monitor) {
    const isCanaResult = result._apiVersion?.startsWith("zenith-cana-hf-")
    section(caneAnalysis ? "Registro visual da análise da cana" : "Comparação visual")
    if (isCanaResult && result.analysisSrc) {
      await picture(images[0]?.preview, "Imagem original submetida à análise.")
      await picture(result.analysisSrc, result.analysis_profile === "dossel_fechado"
        ? "Mapa de vistoria: setores com cobertura abaixo da referência local do dossel."
        : "Mapa de vistoria: zonas consolidadas para conferência no talhão.")
    } else if (images[0]?.preview && result.overlay_image) {
      const comparison = await Promise.all([loadImage(images[0].preview), loadImage(`data:image/jpeg;base64,${result.overlay_image}`)])
      reserve(83)
      comparison.forEach((img, index) => {
        const w = Math.min(85, 66 * img.width / img.height)
        const h = w * img.height / img.width
        doc.addImage(img.data, "JPEG", 16 + index * 93 + (85 - w) / 2, y + (66 - h) / 2, w, h)
      })
      y += 72; doc.setFontSize(8); doc.setTextColor(40, 58, 46)
      doc.text("Imagem original", 16, y); doc.text("Análise do Zenith / overlay", 109, y); y += 9
    } else await picture(images[0]?.preview, "Imagem original submetida à análise pelo Zenith.")
    if (result.overlay_image) {
      if (!images[0]?.preview) await picture(`data:image/jpeg;base64,${result.overlay_image}`, "Overlay gerado pela análise de Visão Computacional.")
      section("Legenda do overlay")
      for (const [color, label] of [[[86,168,112],"Vegetação detectada"],[[245,158,11],"Baixa densidade - atenção moderada"],[[239,68,68],"Baixa densidade - atenção alta"],[[59,130,246],"Caminho identificado"]]) {
        reserve(8); doc.setFillColor(...color); doc.rect(16, y - 3, 3, 3, "F"); doc.setFontSize(9); doc.text(label, 22, y); y += 7
      }
    }
    if (isCanaResult) {
      section("Legenda do resultado")
      const caneLegend = result.analysis_profile === "dossel_fechado"
        ? [[[245,158,11],"Setores com cobertura abaixo da referência local"]]
        : [[[255,66,66],"Zonas com possíveis descontinuidades próximas"]]
      for (const [color, label] of caneLegend) {
        reserve(8); doc.setFillColor(...color); doc.rect(16, y - 3, 3, 3, "F"); doc.setFontSize(9); doc.text(label, 22, y); y += 7
      }
      text("Os destaques são sinais visuais para orientar a vistoria. Não identificam espécies, causas ou necessidade de intervenção.", 9)
    } else {
      text("As regiões destacadas correspondem à análise visual da imagem e não representam, nesta versão, delimitação georreferenciada da área.", 9)
    }
    reserve(106); section("Síntese da análise")
    // The legacy adapter supplies synthetic defaults. Do not export those as API measurements.
    if (isCanaResult) {
      const closedCanopy = result.analysis_profile === "dossel_fechado"
      field("Perfil da leitura", closedCanopy ? "Dossel fechado - uniformidade relativa" : "Fileiras visíveis - falhas do estande")
      field("Qualidade da leitura", closedCanopy ? "Triagem relativa" : result.analysis_reliable ? "Validada" : result.analysis_usable ? "Assistida" : "Inconclusiva")
      field("Cobertura vegetal aparente", percent(result.coverage, 100))
      if (closedCanopy) {
        field("Uniformidade relativa do dossel", percent(result.canopy_uniformity, 100))
        field("Setores para conferência", result.inspection_region_count)
        text("Com o dossel fechado, a imagem RGB não permite medir falhas por fileira. Os setores destacados destoam da referência da própria imagem e não determinam causa agronômica.", 9)
      } else {
        field("Zonas priorizadas para vistoria", result.analysis_usable ? result.inspection_region_count : null)
        field("Participação das falhas na extensão analisada", result.analysis_usable ? percent(result.possible_gap_share, 100) : null)
        field("Extensão acumulada das possíveis falhas", result.analysis_usable && numeric(result.possible_gap_length_meters) ? `${result.possible_gap_length_meters} m` : null)
        field("Linhas com possível falha", result.analysis_usable ? result.rows_with_possible_gaps : null)
        field("Fileiras identificadas", typeof result.rows?.detected === "boolean" ? result.rows.detected ? "Sim" : "Não" : null)
        field("Quantidade estimada de fileiras", result.analysis_usable ? result.rows?.row_count : null)
        field("Espaçamento mediano entre linhas", result.analysis_usable && numeric(result.median_row_spacing_meters) ? `${result.median_row_spacing_meters} m` : null)
        field("Orientação dominante", result.analysis_usable && numeric(result.rows?.orientation_deg) ? `${result.rows.orientation_deg} graus` : null)
        text("Possíveis falhas são descontinuidades visuais ao longo das linhas. Confirme tudo em campo.", 9)
      }
      if (Array.isArray(result.attention_regions) && result.attention_regions.length) {
        section("Roteiro priorizado de vistoria")
        result.attention_regions.forEach((region, index) => {
          const number = region.inspection_id || index + 1
          const location = region.region_type === "inspection_zone"
            ? `Zona ${number} - ${region.affected_row_count || 1} ${(region.affected_row_count || 1) === 1 ? "fileira" : "fileiras"}`
            : region.location_label || `Fileira ${Number(region.row_id || 0) + 1}`
          const evidence = Math.round(region.visual_evidence_score || 0)
          const impact = Math.round(region.impact_score || 0)
          field(`Ponto ${String(number).padStart(2, "0")} - ${location}`, `evidência ${evidence}/100 | impacto ${impact}/100 | prioridade ${readable(region.visual_inspection_priority || "moderada")}`)
        })
      }
    } else if (result._apiVersion !== "v1") {
      field("Cobertura vegetal", percent(result.coverage, 100)); field("Uniformidade", percent(result.uniformity, 100))
      field("Índice de baixa densidade", percent(result.failure_score, 100))
      field("Nível de atenção", present(result.failure_level) ? ({ ALTO: "Alta", MEDIO: "Moderada", BAIXO: "Baixa" }[result.failure_level] || readable(result.failure_level)) : null)
      field("Caminhos identificados na imagem", percent(result.path_coverage, 100))
      field("Sombra na imagem", percent(result.shadow_coverage, 100))
      field("Iluminação", ({ good: "Boa", moderate: "Moderada", poor: "Ruim" })[result.illumination_quality] || result.illumination_quality)
      field("Fileiras identificadas", typeof result.rows?.detected === "boolean" ? result.rows.detected ? "Sim" : "Não" : null)
      field("Quantidade de fileiras", result.rows?.row_count)
      field("Orientação das fileiras", numeric(result.rows?.orientation_deg) ? `${result.rows.orientation_deg} graus` : null)
      field("Alinhamento", typeof result.alignment?.aligned === "boolean" ? result.alignment.aligned ? "Alinhado" : "Desalinhado" : null)
    } else text("Este registro antigo não permite confirmar a origem de todas as métricas. Por isso, elas não são apresentadas neste relatório.")
    const warnings = result.warnings || result.avisos
    if (Array.isArray(warnings)) warnings.filter(v => typeof v === "string").forEach(v => field("Aviso", v))
    else if (typeof warnings === "string") field("Aviso", warnings)
    field("Mensagem", result.mensagem || result.message)
  } else if (result.resultado_geral) {
    section("Resultado geral das imagens"); screening(result.resultado_geral, true)
    field("Fotos recebidas", result.resultado_geral.total_recebidas)
    field("Resultados confiáveis", result.resultado_geral.resultados_confiaveis)
    conditionSummary(result.resultado_geral.ocorrencias_confiaveis)
    section("Como interpretar este relatório")
    text("O resumo apresenta o resultado do conjunto. As páginas seguintes mostram as fotos numeradas e suas classificações. Resultados inconclusivos não confirmam uma ocorrência.")
    await imageGrid(result.resultados || [])
  } else {
    section("Imagem analisada"); await picture(images[0]?.preview, "Imagem submetida à análise pelo Zenith.")
    if (!images[0]?.preview) text("Imagem original não disponível neste registro.", 9)
    section("Resultado da triagem"); screening(result)
  }
  inspection()
  const total = doc.getNumberOfPages()
  for (let n = 1; n <= total; n++) {
    doc.setPage(n); doc.setDrawColor(215, 227, 217); doc.line(16, 273, 194, 273)
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(90, 110, 96)
    doc.text("ZENITH | Relatório gerado automaticamente pela plataforma Zenith.", 16, 279)
    doc.text(doc.splitTextToSize(DISCLAIMER, 150), 16, 284)
    doc.text(`Página ${n} de ${total}`, 194, 279, { align: "right" })
  }
  const pad = n => String(n).padStart(2, "0")
  const stamp = `${generated.getFullYear()}-${pad(generated.getMonth()+1)}-${pad(generated.getDate())}_${pad(generated.getHours())}${pad(generated.getMinutes())}`
  const reportName = caneAnalysis ? "Analise_Cana" : monitor ? "Monitoramento_Plantacao" : `Triagem_Fitossanitaria_${cultureLabel}`
  return { doc, filename: `Zenith_${reportName}_${stamp}.pdf` }
}
