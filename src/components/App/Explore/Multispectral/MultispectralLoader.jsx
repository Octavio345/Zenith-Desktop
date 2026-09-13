const STATUS_CONTENT = {
  connecting: ["Conectando ao serviço de análise", "Preparando um canal seguro para o envio das bandas."],
  waking: ["Preparando o ambiente de análise", "O serviço estava em espera e pode levar alguns instantes para iniciar."],
  uploading: ["Enviando bandas multiespectrais", "Mantenha esta tela aberta enquanto os arquivos são transferidos."],
  queued: ["Levantamento na fila de processamento", "A análise começará assim que houver capacidade disponível."],
  analyzing: ["Analisando a resposta espectral", "Calculando índices e localizando padrões diferentes na vegetação."],
  finalizing: ["Preparando mapas e resultados", "Organizando as visualizações e o pacote para download."],
  unavailable: ["Verificando disponibilidade", "O serviço está iniciando ou temporariamente indisponível."],
}

export default function MultispectralLoader({ status = "connecting", onCancel }) {
  const [title, description] = STATUS_CONTENT[status] || STATUS_CONTENT.connecting

  return (
    <section className="ms-loader" role="status" aria-live="polite">
      <div className="ms-loader__visual" aria-hidden="true">
        <span className="ms-loader__orbit ms-loader__orbit--one" />
        <span className="ms-loader__orbit ms-loader__orbit--two" />
        <span className="material-symbols-outlined">satellite_alt</span>
      </div>
      <span className="ms-eyebrow">Análise em andamento</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="ms-loader__steps" aria-hidden="true">
        <i className="is-active" /><i className={status !== "connecting" ? "is-active" : ""} /><i className={["analyzing", "finalizing"].includes(status) ? "is-active" : ""} />
      </div>
      <small>Não exibimos porcentagem porque o serviço não fornece progresso percentual real.</small>
      <button type="button" className="ms-secondary-button" onClick={onCancel}>Cancelar análise</button>
    </section>
  )
}
