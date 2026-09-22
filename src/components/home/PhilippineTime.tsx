import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

function formatPhilippineTime(date: Date, language: string): string {
  return new Intl.DateTimeFormat(language.startsWith("fil") ? "fil-PH" : "en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}

export function PhilippineTime() {
  const { i18n, t } = useTranslation("common");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <span className="info-bar__item">
      <span className="info-bar__label">{t("info.philippineTime")}</span>
      <time dateTime={now.toISOString()}>{formatPhilippineTime(now, i18n.language)}</time>
    </span>
  );
}
