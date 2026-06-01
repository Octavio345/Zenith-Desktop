import styles from "../../../../styles/App/MonitoramentoView.module.css"

const ALERT_ICONS = {
  perigo: "notification_important",
  aviso: "warning",
  ok: "check_circle",
}

export default function AlertBanner({ alerta }) {
  if (!alerta) return null

  const nivel = alerta.nivel || "ok"
  const icon = ALERT_ICONS[nivel] || ALERT_ICONS.ok

  return (
    <div className={`${styles.alertBanner} ${styles[`alertBanner_${nivel}`]}`}>
      <span
        className={`material-symbols-outlined ${styles.alertBannerIcon}`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <p className={styles.alertBannerText}>{alerta.texto}</p>
    </div>
  )
}
