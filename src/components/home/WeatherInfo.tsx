import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { loadLguConfig } from "../../app/lguConfig";
import {
  fetchCurrentWeather,
  weatherCodeKey,
  type WeatherSnapshot,
} from "../../lib/ui/weather";

type WeatherState =
  | { status: "loading" }
  | { status: "ready"; snapshot: WeatherSnapshot }
  | { status: "unavailable" };

const coordinates = loadLguConfig().lgu.coordinates;

export function WeatherInfo() {
  const { t } = useTranslation("common");
  const [state, setState] = useState<WeatherState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    void fetchCurrentWeather(coordinates, controller.signal)
      .then((snapshot) => setState({ status: "ready", snapshot }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ status: "unavailable" });
      });

    return () => controller.abort();
  }, []);

  if (state.status === "loading") {
    return <span className="info-bar__item">{t("info.weatherLoading")}</span>;
  }

  if (state.status === "unavailable") {
    return <span className="info-bar__item">{t("info.weatherUnavailable")}</span>;
  }

  const conditionKey = weatherCodeKey(state.snapshot.weatherCode);

  return (
    <span className="info-bar__item">
      <span className="info-bar__label">{t("info.weatherLabel")}</span>
      <a
        href={state.snapshot.sourceUrl}
        target="_blank"
        rel="noreferrer"
        title={t("provenance.verifyOfficialSource")}
      >
        {state.snapshot.temperatureC.toFixed(1)}°C · {t(`info.weather.${conditionKey}`)}
      </a>
    </span>
  );
}
