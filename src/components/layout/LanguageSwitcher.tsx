import { useEffect, useState } from "react";

import {
  getInitialLocale,
  i18n,
  setLocale,
  SUPPORTED_LOCALES,
  type Locale,
} from "../../i18n";

export function LanguageSwitcher() {
  const [locale, setCurrentLocale] = useState<Locale>(getInitialLocale());

  useEffect(() => {
    const handleLanguageChanged = (language: string) => {
      setCurrentLocale(language.startsWith("fil") ? "fil" : "en");
    };

    i18n.on("languageChanged", handleLanguageChanged);
    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, []);

  async function handleChange(nextLocale: Locale): Promise<void> {
    await setLocale(nextLocale);
  }

  return (
    <label className="language-switcher">
      <span className="sr-only">{i18n.t("language.switcherLabel")}</span>
      <select
        aria-label={i18n.t("language.switcherLabel")}
        data-testid="language-switcher"
        value={locale}
        onChange={(event) => void handleChange(event.target.value as Locale)}
      >
        {SUPPORTED_LOCALES.map((supportedLocale) => (
          <option key={supportedLocale} value={supportedLocale}>
            {i18n.t(`language.${supportedLocale === "en" ? "english" : "filipino"}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
