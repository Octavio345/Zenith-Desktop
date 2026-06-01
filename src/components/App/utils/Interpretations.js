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
      texto: `Cobertura de ${pct}% muito abaixo do esperado. Pode haver falha de germinacao ou estande comprometido.`,
    }
  }

  if (coverage < THRESHOLDS.coverage.moderado) {
    return {
      tipo: "aviso",
      texto: `Cobertura de ${pct}% abaixo do ideal. Acompanhe o desenvolvimento nos proximos dias.`,
    }
  }

  return {
    tipo: "ok",
    texto: `Cobertura de ${pct}% dentro do esperado para a fase de crescimento.`,
  }
}

function interpretarFalhas(failureScore, failureLevel) {
  const pct = Math.round(failureScore * 100)
  const nivel = normalizarNivelFalha(failureLevel)

  if (nivel === "ALTO") {
    return {
      tipo: "perigo",
      texto: `${pct}% da area com falhas criticas. Avaliacao urgente e possivel replantio recomendados.`,
    }
  }

  if (nivel === "MEDIO") {
    return {
      tipo: "aviso",
      texto: `${pct}% da area com falhas moderadas. Agende uma visita tecnica para avaliacao presencial.`,
    }
  }

  return {
    tipo: "ok",
    texto: "Distribuicao do plantio em boas condicoes. Nenhuma falha significativa detectada.",
  }
}

function interpretarUniformidade(uniformity) {
  const pct = Math.round(uniformity * 100)

  if (uniformity < THRESHOLDS.uniformity.baixa) {
    return {
      tipo: "aviso",
      texto: `Uniformidade de ${pct}%. A distribuicao esta irregular entre regioes do talhao.`,
    }
  }

  if (uniformity >= THRESHOLDS.uniformity.media) {
    return {
      tipo: "ok",
      texto: `Uniformidade de ${pct}%. Boa homogeneidade na distribuicao do plantio.`,
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
        texto: "Estrutura de fileiras nao identificada. Pode indicar dossel fechado ou imagem inclinada.",
      }
    }
    return null
  }

  const partes = ["Fileiras detectadas com regularidade."]
  if (rows.row_count) partes.push(`Estimativa: ${rows.row_count} fileiras.`)
  if (rows.orientation_deg != null) partes.push(`Angulo: ${rows.orientation_deg} graus.`)

  return { tipo: "info", texto: partes.join(" ") }
}

function interpretarIluminacao(quality, shadowCoverage) {
  if (quality === "poor") {
    return {
      tipo: "aviso",
      texto: "Qualidade de iluminacao ruim. Os resultados podem ser menos precisos.",
    }
  }

  if (shadowCoverage > 0.2) {
    return {
      tipo: "info",
      texto: `${Math.round(shadowCoverage * 100)}% da imagem esta em sombra. Essas areas foram excluidas da analise.`,
    }
  }

  return null
}

function interpretarCaminhos(pathCoverage) {
  if (!pathCoverage || pathCoverage < THRESHOLDS.paths.alto) return null

  return {
    tipo: "info",
    texto: `${Math.round(pathCoverage * 100)}% da imagem foi identificado como caminho de maquinario e excluido da contagem.`,
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
    interpretarCobertura(coverage),
    interpretarFalhas(failure_score, failure_level),
    interpretarUniformidade(uniformity),
    interpretarFileiras(rows),
    interpretarIluminacao(illumination_quality, shadow_coverage),
    interpretarCaminhos(path_coverage),
  ].filter(Boolean)

  const perigo = candidatos.find((item) => item.tipo === "perigo")
  const aviso = candidatos.find((item) => item.tipo === "aviso")

  const alertaPrincipal = perigo || aviso || {
    nivel: "ok",
    texto: "Plantio em boas condicoes. Nenhuma intervencao urgente necessaria.",
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
