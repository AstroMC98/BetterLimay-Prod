import "leaflet/dist/leaflet.css";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import { geoJSON } from "leaflet";
import type { FeatureCollection } from "geojson";

const DATASET_URL = "/data/limay-flood-100yr.geojson";

/**
 * Sequential, one hue, light to dark: the levels differ in lightness, so they
 * stay distinguishable under colour-vision deficiency, and the ramp reads as
 * "more" without a legend. Close to NOAH's own yellow-orange-red.
 */
export const HAZARD_COLOURS = {
  low: "#fdd49e",
  medium: "#fc8d59",
  high: "#b30000",
} as const;

type Level = keyof typeof HAZARD_COLOURS;

interface HazardCollection extends FeatureCollection {
  areasKm2: Partial<Record<Level, number>>;
  attribution: string;
}

function FitToLayer({ data }: { data: HazardCollection }) {
  const map = useMap();
  useEffect(() => {
    const bounds = geoJSON(data).getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [16, 16] });
  }, [data, map]);
  return null;
}

export default function FloodHazardMap() {
  const { t } = useTranslation("common");
  const [data, setData] = useState<HazardCollection | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(DATASET_URL)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<HazardCollection>;
      })
      .then((collection) => !cancelled && setData(collection))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) return <p className="data-chart__note">{t("hazards.unavailable")}</p>;
  if (!data) return <p className="data-chart__note">{t("hazards.loading")}</p>;

  const levels: Level[] = ["low", "medium", "high"];

  return (
    <div className="hazard-map" data-testid="flood-hazard-map">
      <ul className="hazard-legend" aria-label={t("hazards.legendLabel")}>
        {levels.map((level) => (
          <li key={level}>
            <span
              className="hazard-legend__swatch"
              style={{ background: HAZARD_COLOURS[level] }}
              aria-hidden="true"
            />
            <span>
              <strong>{t(`hazards.levels.${level}`)}</strong>{" "}
              {t(`hazards.depths.${level}`)}
            </span>
            {data.areasKm2[level] !== undefined ? (
              <span className="hazard-legend__area">
                {t("hazards.area", { km2: data.areasKm2[level]?.toFixed(1) })}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <div
        className="hazard-map__frame"
        role="img"
        aria-label={t("hazards.mapLabel", {
          low: data.areasKm2.low?.toFixed(1) ?? "0",
          medium: data.areasKm2.medium?.toFixed(1) ?? "0",
          high: data.areasKm2.high?.toFixed(1) ?? "0",
        })}
      >
        <MapContainer
          center={[14.56, 120.6]}
          zoom={12}
          scrollWheelZoom={false}
          className="hazard-map__canvas"
        >
          <TileLayer
            attribution={`&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Flood hazard: UP NOAH Center (ODbL)`}
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <GeoJSON
            data={data}
            style={(feature) => {
              const level = (feature?.properties?.level ?? "low") as Level;
              return {
                color: HAZARD_COLOURS[level],
                weight: 0.5,
                fillColor: HAZARD_COLOURS[level],
                fillOpacity: 0.65,
              };
            }}
          />
          <FitToLayer data={data} />
        </MapContainer>
      </div>
    </div>
  );
}
