import { APP_LANGUAGES } from "../../../constants/appLanguages"
import "../../../styles/Global/LanguagePicker.css"

function FlagIcon({ country }) {
  if (country === "pt-BR") {
    return <svg className="language-picker__flag" viewBox="0 0 28 20" role="img" aria-label="Bandeira do Brasil"><rect width="28" height="20" rx="3" fill="#169B62"/><path d="M14 2.4 25.2 10 14 17.6 2.8 10 14 2.4Z" fill="#FFDF00"/><circle cx="14" cy="10" r="4.15" fill="#002776"/><path d="M10.2 9.1c2.6-.75 5.25-.45 7.6.7" fill="none" stroke="#FFF" strokeWidth=".8"/></svg>
  }
  if (country === "en-US") {
    return <svg className="language-picker__flag" viewBox="0 0 28 20" role="img" aria-label="Bandeira dos Estados Unidos"><rect width="28" height="20" rx="3" fill="#FFF"/><path d="M0 0h28v2H0Zm0 4h28v2H0Zm0 4h28v2H0Zm0 4h28v2H0Zm0 4h28v2H0Z" fill="#B22234"/><path d="M0 0h12.5v10H0Z" fill="#3C3B6E"/><path d="m2 2 .45 1 .95.08-.73.6.23.92L2 4.08l-.9.52.23-.92-.73-.6.95-.08L2 2Zm3.3 0 .45 1 .95.08-.73.6.23.92- .9-.52-.9.52.23-.92-.73-.6.95-.08.45-1Zm3.3 0 .45 1 .95.08-.73.6.23.92-.9-.52-.9.52.23-.92-.73-.6.95-.08.45-1ZM3.65 5l.45 1 .95.08-.73.6.23.92-.9-.52-.9.52.23-.92-.73-.6.95-.08.45-1Zm3.3 0 .45 1 .95.08-.73.6.23.92-.9-.52-.9.52.23-.92-.73-.6.95-.08.45-1Z" fill="#FFF"/></svg>
  }
  return <svg className="language-picker__flag" viewBox="0 0 28 20" role="img" aria-label="Bandeira da Espanha"><rect width="28" height="20" rx="3" fill="#AA151B"/><rect y="5" width="28" height="10" fill="#F1BF00"/><path d="M7 8.1h2.2v3.8H7z" fill="#AA151B" opacity=".85"/><path d="M8.1 8.9v2.3M7.45 9.5h1.3" stroke="#F1BF00" strokeWidth=".45"/></svg>
}

export default function LanguagePicker({ value, onChange, compact = false }) {
  return (
    <div className={`language-picker${compact ? " language-picker--compact" : ""}`} role="group" aria-label="Idioma da interface">
      {!compact && <div className="language-picker__heading"><span className="material-symbols-outlined" aria-hidden="true">translate</span><span><strong>Idioma do aplicativo</strong><small>Escolha o idioma da interface</small></span></div>}
      <div className="language-picker__options">
        {APP_LANGUAGES.map((language) => (
          <button
            key={language.code}
            type="button"
            className={value === language.code ? "language-picker__option is-active" : "language-picker__option"}
            onClick={() => onChange(language.code)}
            aria-pressed={value === language.code}
            title={language.label}
          >
            <FlagIcon country={language.code} />
            <span>{language.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
