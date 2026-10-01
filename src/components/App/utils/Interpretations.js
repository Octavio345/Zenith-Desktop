const THRESHOLDS = {
  coverage: { critico: 0.25, moderado: 0.5 },
  failure: { alto: 0.25, medio: 0.1 },
  uniformity: { baixa: 0.5, media: 0.75 },
  periodicity: { fraco: 0.25 },
  paths: { alto: 0.08 },
}

export function normalizarNivelFalha(level) {
  const valor = String(level || "BAIXO").toUpperCase()
  if (valor.includes("ALTO")) return "ALTO"
  if (valor.includes("MED")) return "MEDIO"
  if (valor.startsWith("M")) return "MEDIO"
  return "BAIXO"
}

function interpretarCobertura(coverage) {
  const pct = Math.round(coverage * 100)

  if (coverage < THRESHOLDS.coverage.critico) {
    return {
      tipo: "perigo",
      texto: `Cobertura vegetal de ${pct}% na imagem. Confirme as regiões de baixa densidade em campo.`,
    }
  }

  if (coverage < THRESHOLDS.coverage.moderado) {
    return {
      tipo: "aviso",
      texto: `Cobertura vegetal de ${pct}% na imagem. Acompanhe o desenvolvimento e confirme em campo.`,
    }
  }

  return {
    tipo: "ok",
    texto: `Cobertura vegetal de ${pct}% na imagem. Interprete conforme a fase da cultura em campo.`,
  }
}

function interpretarFalhas(failureScore, failureLevel) {
  const pct = Math.round(failureScore * 100)
  const nivel = normalizarNivelFalha(failureLevel)

  if (nivel === "ALTO") {
    return {
      tipo: "perigo",
      texto: `Baixa densidade identificada — atenção alta. Índice de baixa densidade: ${pct}%. Confirme em campo.`,
    }
  }

  if (nivel === "MEDIO") {
    return {
      tipo: "aviso",
      texto: `Baixa densidade identificada — atenção moderada. Índice de baixa densidade: ${pct}%. Confirme em campo.`,
    }
  }

  return {
    tipo: "ok",
    texto: "Baixo nível de atenção indicado na imagem. Mantenha o acompanhamento em campo.",
  }
}

function interpretarUniformidade(uniformity) {
  const pct = Math.round(uniformity * 100)

  if (uniformity < THRESHOLDS.uniformity.baixa) {
    return {
      tipo: "aviso",
      texto: `Uniformidade de ${pct}%. A distribuição está irregular entre regiões do talhão.`,
    }
  }

  if (uniformity >= THRESHOLDS.uniformity.media) {
    return {
      tipo: "ok",
      texto: `Uniformidade de ${pct}%. Boa homogeneidade na distribuição do plantio.`,
    }
  }

  return null
}

function interpretarFileiras(rows) {
  if (!rows) return null

  if (!rows.detected) {
    if (rows.periodicity_snr < THRESHOLDS.periodicity.fraco) {
      return {
        tipo: "info",
        texto: "Fileiras não identificadas com confiança. Em dossel fechado, isso pode ser esperado.",
      }
    }
    return {
      tipo: "info",
      texto: "As fileiras não atingiram confiança suficiente para estimar alinhamento e espaçamento.",
    }
  }

  const partes = ["Fileiras detectadas com regularidade."]
  if (rows.row_count) partes.push(`Estimativa: ${rows.row_count} fileiras.`)
  if (rows.orientation_deg != null) partes.push(`Ângulo: ${rows.orientation_deg} graus.`)

  return { tipo: "info", texto: partes.join(" ") }
}

function interpretarIluminacao(quality, shadowCoverage) {
  if (quality === "poor") {
    return {
      tipo: "aviso",
      texto: "Qualidade de iluminação ruim. Os resultados podem ser menos precisos.",
    }
  }

  if (shadowCoverage > 0.2) {
    return {
      tipo: "info",
      texto: `${Math.round(shadowCoverage * 100)}% da imagem está em sombra. Essas áreas foram excluídas da análise.`,
    }
  }

  return null
}

function interpretarCaminhos(pathCoverage) {
  if (!pathCoverage || pathCoverage < THRESHOLDS.paths.alto) return null

  return {
    tipo: "info",
    texto: `${Math.round(pathCoverage * 100)}% da imagem foi identificado como caminho de maquinário e excluído da contagem.`,
  }
}

function interpretarZenithCana(result) {
  const insights = []
  const coverage = result.coverage
  const regions = Number(result.inspection_region_count || 0)
  const rows = result.rows
  const integrity = result.stand_integrity
  const gapShare = result.possible_gap_share
  const interrowShare = result.interrow_vegetation_share

  if (result.analysis_usable === false) {
    const reason = result.quality_reasons?.[0]
    const mainText = "Leitura inconclusiva: a imagem não mostrou fileiras de cana com estrutura suficiente para medir falhas com segurança."
    return {
      alertaPrincipal: { nivel: "aviso", texto: mainText },
      insights: [
        { tipo: "aviso", texto: mainText },
        reason && { tipo: "info", texto: `Motivo técnico: ${reason}.` },
        { tipo: "info", texto: "Tente uma foto nadiral ou ortomosaico, com fileiras visíveis, escala uniforme e pouca sombra." },
      ].filter(Boolean),
    }
  }

  if (result.analysis_usable && !result.analysis_reliable) {
    insights.push({
      tipo: "info",
      texto: "Leitura assistida: o padrão das fileiras é útil para direcionar a vistoria, mas não deve ser usado como medição contratual sem GSD e ortomosaico.",
    })
  }

  if (coverage != null) {
    insights.push({
      tipo: "info",
      texto: `Cobertura vegetal aparente de ${Math.round(coverage * 100)}%. O valor deve ser interpretado conforme a idade e o estágio do canavial.`,
    })
  }

  if (integrity != null) {
    insights.push({
      tipo: integrity < 0.75 ? "aviso" : integrity >= 0.9 ? "ok" : "info",
      texto: `Integridade visual do estande de ${Math.round(integrity * 100)}% nas linhas analisadas.`,
    })
  }

  if (regions > 0) {
    const gapText = gapShare != null
      ? `, somando aproximadamente ${Math.round(gapShare * 100)}% da extensão de linhas avaliada`
      : ""
    insights.push({
      tipo: result.failure_level === "ALTO" ? "aviso" : "info",
      texto: `${regions} ${regions === 1 ? "zona com possíveis descontinuidades foi destacada" : "zonas com possíveis descontinuidades foram destacadas"}${gapText}. Os sinais próximos já foram agrupados; confirme brotação, danos e continuidade das linhas em campo.`,
    })
  } else {
    insights.push({
      tipo: "ok",
      texto: "Nenhuma zona de descontinuidade do estande foi destacada com os critérios visuais desta análise.",
    })
  }

  if (result.interrow_assessed && interrowShare != null) {
    const interrowPct = Math.round(interrowShare * 100)
    insights.push({
      tipo: interrowPct >= 20 ? "aviso" : "info",
      texto: `${interrowPct}% da vegetação detectada apareceu fora dos corredores estimados das linhas. Pode indicar competição nas entrelinhas, bordadura ou erro de segmentação; não identifica a espécie.`,
    })
  }

  if (rows) {
    const confidencePct = Math.round((rows.periodicity_snr || 0) * 100)
    if (rows.detected) {
      const details = []
      if (rows.row_count) details.push(`estimativa de ${rows.row_count} fileiras`)
      if (rows.orientation_deg != null) details.push(`orientação de ${rows.orientation_deg}°`)
      details.push(`confiança estrutural de ${confidencePct}%`)
      insights.push({
        tipo: confidencePct >= 45 ? "info" : "aviso",
        texto: `Estrutura de linhas identificada: ${details.join(", ")}.`,
      })
    } else {
      insights.push({
        tipo: "info",
        texto: "A estrutura das fileiras não atingiu confiança suficiente nesta imagem. Altura, sombra e dossel fechado podem influenciar o resultado.",
      })
    }
  }

  const aviso = insights.find((item) => item.tipo === "aviso")
  const alertaPrincipal = aviso || {
    nivel: "ok",
    texto: "Análise específica do estande concluída. Use o resultado visual para direcionar a vistoria do canavial.",
  }

  return {
    alertaPrincipal: {
      nivel: alertaPrincipal.tipo || alertaPrincipal.nivel,
      texto: alertaPrincipal.texto,
    },
    insights,
  }
}

export function interpretar(result) {
  if (result?._apiVersion?.startsWith("zenith-cana-hf-")) {
    return interpretarZenithCana(result)
  }

  const {
    coverage = 0,
    failure_score = 0,
    failure_level = "BAIXO",
    uniformity = 0,
    rows,
    illumination_quality = "good",
    shadow_coverage = 0,
    path_coverage = 0,
  } = result

  const candidatos = [
    result.coverage != null && interpretarCobertura(coverage),
    result.failure_score != null && result.failure_level != null && interpretarFalhas(failure_score, failure_level),
    result.uniformity != null && interpretarUniformidade(uniformity),
    interpretarFileiras(rows),
    result._apiVersion !== "v1" && interpretarIluminacao(illumination_quality, shadow_coverage),
    interpretarCaminhos(path_coverage),
  ].filter(Boolean)

  const perigo = candidatos.find((item) => item.tipo === "perigo")
  const aviso = candidatos.find((item) => item.tipo === "aviso")

  const alertaPrincipal = perigo || aviso || {
    nivel: "ok",
    texto: "Interprete a imagem e confirme as observações em campo antes de qualquer intervenção.",
  }

  return {
    alertaPrincipal: {
      nivel: alertaPrincipal.tipo || alertaPrincipal.nivel,
      texto: alertaPrincipal.texto,
    },
    insights: candidatos,
  }
}

export function coresNivelFalha(level) {
  switch (normalizarNivelFalha(level)) {
    case "ALTO":
      return {
        fundo: "#fff1f0",
        texto: "#a61b14",
        borda: "#e7a29d",
      }
    case "MEDIO":
      return {
        fundo: "#fff7e6",
        texto: "#9a5100",
        borda: "#e6b45c",
      }
    default:
      return {
        fundo: "#edf7ef",
        texto: "#245f39",
        borda: "#9bc8a7",
      }
  }
}

export function corPorValor(value, { bom, aviso }) {
  if (value >= bom) return "#348454"
  if (value >= aviso) return "#b86600"
  return "#b42318"
}
