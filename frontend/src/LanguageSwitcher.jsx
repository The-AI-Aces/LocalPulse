import { useLanguage, availableLanguages } from './LanguageContext'

function LanguageSwitcher() {
  const { lang, changeLanguage } = useLanguage()

  return (
    <select
      className="language-switcher"
      value={lang}
      onChange={(e) => changeLanguage(e.target.value)}
    >
      {availableLanguages.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  )
}

export default LanguageSwitcher