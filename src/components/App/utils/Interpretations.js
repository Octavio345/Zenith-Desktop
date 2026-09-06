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
      texto: `Região de baixa densidade — atenção alta. Índice retornado: ${pct}%. Confirme em campo.`,
    }
  }

  if (nivel === "MEDIO") {
    return {
      tipo: "aviso",
      texto: `Região de baixa densidade — atenção moderada. Índice retornado: ${pct}%. Confirme em campo.`,
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

export function interpretar(result) {
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
        fundo: "rgba(255, 77, 77, 0.12)",
        texto: "#ff4d4d",
        borda: "rgba(255, 77, 77, 0.35)",
      }
    case "MEDIO":
      return {
        fundo: "rgba(255, 170, 0, 0.12)",
        texto: "#ffaa00",
        borda: "rgba(255, 170, 0, 0.35)",
      }
    default:
      return {
        fundo: "rgba(86, 168, 112, 0.08)",
        texto: "#56a870",
        borda: "rgba(86, 168, 112, 0.25)",
      }
  }
}

export function corPorValor(value, { bom, aviso }) {
  if (value >= bom) return "#56a870"
  if (value >= aviso) return "#ffaa00"
  return "#ff4d4d"
}
