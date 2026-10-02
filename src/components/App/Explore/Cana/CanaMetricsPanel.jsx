import { memo } from "react"
import styles from "../../../../styles/App/CanaAnalysisView.module.css"

function Metric({ icon, label, value, detail }) {
  return (
    <div className={styles.metric}>
      <span className={`material-symbols-outlined ${styles.metricIcon}`} aria-hidden="true">{icon}</span>
      <div><span className={styles.metricLabel}>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>
    </div>
  )
}

function formatLength(region) {
  if (region.length_meters != null) return `${region.length_meters} m`
  if (region.length_pixels != null) return `${Math.round(region.length_pixels)} px`
  return "setor relativo"
}

function CanaMetricsPanel({ result, hideMetrics = false }) {
  if (!result) return null

  const closedCanopy = result.analysis_profile === "dossel_fechado"
  const reliable = result.analysis_reliable === true
  const usable = result.analysis_usable === true
  const assisted = usable && !reliable && !closedCanopy
  const inspectionRegions = Array.isArray(result.attention_regions) ? result.attention_regions : []
  const rowInventory = Array.isArray(result.row_inventory) ? result.row_inventory : []
  const recoveredRows = rowInventory.filter((row) => row.detection_source !== "direct_peak").length
  const boundaryRows = rowInventory.filter((row) => row.detection_source === "boundary_extrapolation").length
  const regionCount = inspectionRegions.length
  const rowCount = Number(result.rows?.row_count || 0)
  const rowAngle = result.rows?.orientation_deg == null ? Number.NaN : Number(result.rows.orientation_deg)
  const rowDirectionDetail = Number.isFinite(rowAngle)
    ? `direção dominante ${rowAngle.toFixed(1)}°`
    : reliable ? "inventário completo abaixo" : assisted ? "estimativa assistida" : "controle de qualidade reprovado"
  const reasons = result.quality_reasons || []
  const hasMeters = result.possible_gap_length_meters != null
  const gapLength = hasMeters ? `${result.possible_gap_length_meters} m` : result.possible_gap_length_pixels ? `${Math.round(result.possible_gap_length_pixels)} px` : "—"
  const dimensions = result.source_dimensions?.width && result.source_dimensions?.height
    ? `${result.source_dimensions.width} × ${result.source_dimensions.height} px`
    : "resolução preservada"
  const headline = closedCanopy
    ? regionCount > 0 ? `${regionCount} ${regionCount === 1 ? "setor destoa" : "setores destoam"} do dossel` : "Dossel fechado sem mancha relevante"
    : usable
      ? regionCount > 0 ? `${regionCount} ${regionCount === 1 ? "zona precisa" : "zonas precisam"} de vistoria` : "Nenhuma zona candidata foi destacada"
      : "Não foi possível medir falhas nesta imagem"

  return (
    <section className={styles.readingPanel} aria-labelledby="cana-reading-title">
      <header className={`${styles.readingHero} ${reliable || closedCanopy ? styles.readingHeroReady : assisted ? styles.readingHeroAssisted : styles.readingHeroInconclusive}`}>
        <div className={styles.readingStatusIcon}><span className="material-symbols-outlined" aria-hidden="true">{closedCanopy ? "landscape" : reliable ? "verified" : assisted ? "manage_search" : "image_not_supported"}</span></div>
        <div>
          <span className={styles.readingEyebrow}>{closedCanopy ? "MODO DOSSEL FECHADO" : reliable ? "LEITURA VALIDADA" : assisted ? "LEITURA ASSISTIDA" : "LEITURA INCONCLUSIVA"}</span>
          <h3 id="cana-reading-title">{headline}</h3>
          <p>{closedCanopy
            ? "As fileiras já não estão separadas visualmente. A leitura mudou para uniformidade relativa e não confunde manchas com falhas de plantio."
            : reliable
              ? "A geometria das fileiras passou pelos controles visuais. Os candidatos estão ordenados por impacto e evidência."
              : assisted
                ? "Há estrutura suficiente para orientar a vistoria, mas pequenas irregularidades reduzem a precisão métrica."
                : "A estrutura das fileiras não ficou nítida o bastante. O sistema bloqueou os números para não apresentar um resultado enganoso."}</p>
        </div>
      </header>

      {!hideMetrics && <div className={styles.metricGrid}>
        {closedCanopy ? <>
          <Metric icon="grass" label="Cobertura aparente" value={result.coverage == null ? "—" : `${Math.round(result.coverage * 100)}%`} detail="vegetação RGB detectada" />
          <Metric icon="donut_large" label="Uniformidade relativa" value={result.canopy_uniformity == null ? "—" : `${Math.round(result.canopy_uniformity * 100)}%`} detail="comparação dentro da imagem" />
          <Metric icon="location_searching" label="Setores sinalizados" value={regionCount} detail={regionCount ? "confirmar causa no campo" : "nenhuma mancha relevante"} />
        </> : <>
          <Metric icon="view_week" label="Fileiras analisadas" value={usable ? rowCount : "Não medidas"} detail={usable ? rowDirectionDetail : "controle de qualidade reprovado"} />
          <Metric icon="location_searching" label="Zonas sinalizadas" value={usable ? regionCount : "—"} detail={usable && regionCount > 0 ? "sinais próximos agrupados" : usable ? "nenhum candidato" : "sem conclusão"} />
          <Metric icon="straighten" label="Extensão sinalizada" value={usable ? gapLength : "—"} detail={usable && !hasMeters ? "informe o GSD para obter metros" : usable ? "soma dos candidatos" : "sem escala confiável"} />
        </>}
      </div>}

      {closedCanopy && <div className={styles.maturityBox}>
        <span className="material-symbols-outlined" aria-hidden="true">info</span>
        <div><strong>O que observar quando a cana já está grande</strong><p>Use esta leitura para procurar manchas de acamamento, falha de fechamento, encharcamento, bordadura ou estresse localizado. Uma fotografia RGB isolada não determina a causa; histórico temporal, NDVI/NDRE ou vistoria tornam a conclusão mais forte.</p></div>
      </div>}

      {!usable && <div className={styles.guidanceBox}>
        <div><span className="material-symbols-outlined" aria-hidden="true">photo_camera</span><strong>Como obter uma leitura melhor</strong></div>
        <p>Use foto nadiral ou ortomosaico, com câmera apontada para baixo, fileiras visíveis, pouca sombra e sem misturar talhões ou culturas na mesma imagem.</p>
        {reasons.length > 0 && <small>Motivo técnico: {reasons.join("; ")}.</small>}
      </div>}

      {assisted && <div className={styles.assistedBox}><span className="material-symbols-outlined" aria-hidden="true">fact_check</span><div><strong>Resultado útil para direcionamento, não para medição contratual</strong><p>Confirme os limites e a causa de cada zona durante a vistoria.</p></div></div>}

      {usable && inspectionRegions.length > 0 && <div className={styles.inspectionPlan}>
        <div className={styles.inspectionPlanHeader}>
          <div><span className={styles.readingEyebrow}>ROTEIRO DE VISTORIA</span><strong>{closedCanopy ? "Setores priorizados por diferença de cobertura" : "Zonas consolidadas por proximidade e impacto"}</strong></div>
          <span>{regionCount} {regionCount === 1 ? "ponto" : "pontos"}</span>
        </div>
        <ol className={styles.inspectionList}>
          {inspectionRegions.map((region, index) => {
            const priority = region.visual_inspection_priority || "moderada"
            const number = region.inspection_id || index + 1
            const rowLabel = closedCanopy
              ? region.location_label || `Setor ${number}`
              : region.region_type === "inspection_zone"
                ? `Zona ${String(number).padStart(2, "0")} · ${region.affected_row_count || 1} ${(region.affected_row_count || 1) === 1 ? "fileira" : "fileiras"}`
                : `Fileira ${Number(region.row_id || 0) + 1}`
            const detail = closedCanopy
              ? `cobertura ${Math.round(region.vegetation_cover_percent || 0)}% · referência ${Math.round(region.reference_cover_percent || 0)}%`
              : `${region.region_type === "inspection_zone" ? `${region.gap_count || 1} ${(region.gap_count || 1) === 1 ? "sinal" : "sinais"} agrupados · ` : ""}${formatLength(region)} · queda ${Math.round(region.relative_cover_drop_percent || 0)}% · ${region.location_label || "posição no mapa"}`
            return <li key={`${region.region_type || "region"}-${number}-${index}`}>
              <span className={styles.inspectionNumber}>{String(number).padStart(2, "0")}</span>
              <div><strong>{rowLabel}</strong><small>{detail}</small><em>Evidência {Math.round(region.visual_evidence_score || 0)}/100 · impacto {Math.round(region.impact_score || 0)}/100</em></div>
              <span className={`${styles.priorityTag} ${styles[`priority_${priority}`]}`}>{priority}</span>
            </li>
          })}
        </ol>
      </div>}

      {!closedCanopy && usable && rowInventory.length > 0 && <details className={styles.rowInventory} open>
        <summary><span><b>Inventário das fileiras</b><small>Todas as {rowInventory.length} fileiras reconhecidas{recoveredRows ? ` · ${recoveredRows} recuperadas pela malha` : ""}{boundaryRows ? ` · ${boundaryRows} estimadas nas bordas` : ""}</small></span><span className="material-symbols-outlined" aria-hidden="true">expand_more</span></summary>
        <div className={styles.rowInventoryHeader}><span>Fileira</span><span>Cobertura</span><span>Falhas</span><span>Situação</span></div>
        <div className={styles.rowInventoryBody}>
          {rowInventory.map((row) => {
            const needsInspection = row.status === "vistoriar"
            return <div className={styles.rowInventoryItem} key={row.row_id}>
              <strong title={row.detection_source === "boundary_extrapolation" ? "Fileira estimada na borda pela continuidade da malha" : row.detection_source === "periodic_recovery" ? "Fileira recuperada pela periodicidade do talhão" : "Fileira detectada diretamente"}>{String(Number(row.row_id) + 1).padStart(2, "0")}</strong>
              <span>{Math.round(Number(row.baseline_vegetation_cover || 0) * 100)}%</span>
              <span>{row.gap_count || 0}</span>
              <span className={needsInspection ? styles.rowAttention : styles.rowClear}>{needsInspection ? `Vistoriar #${(row.inspection_ids || []).join(", #")}` : "Sem sinal relevante"}</span>
            </div>
          })}
        </div>
      </details>}

      <div className={styles.resolutionNote}><span className="material-symbols-outlined" aria-hidden="true">high_res</span><span><strong>Mapa gerado em resolução integral</strong><small>{dimensions} · abra ou baixe a imagem para inspecionar os detalhes</small></span></div>
      <footer className={styles.readingFooter}><span className="material-symbols-outlined" aria-hidden="true">verified_user</span>Triagem por imagem RGB · decisões de manejo exigem validação agronômica</footer>
    </section>
  )
}

export default memo(CanaMetricsPanel)
