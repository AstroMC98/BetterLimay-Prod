import "leaflet/dist/leaflet.css";

import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { useTranslation } from "react-i18next";

import { loadLguConfig } from "../../app/lguConfig";
import { createPortalIdentity } from "../../app/portalIdentity";
import type { VerifiedBarangayMapPoint } from "../../lib/ui/governmentCatalog";

/* Leaflet paints to canvas, so it cannot read the CSS token. Taking the colour from
   the LGU config keeps a fork's map pins in that fork's brand instead of Limay's. */
const brandColor = createPortalIdentity(loadLguConfig()).brandColor;

export default function VerifiedBarangayMap({
  points,
}: {
  points: VerifiedBarangayMapPoint[];
}) {
  const { t } = useTranslation("common");
  const center = points[0]?.coordinates;

  if (!center) {
    return null;
  }

  return (
    <div className="government-map" data-testid="barangay-map">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={12}
        scrollWheelZoom={false}
        className="government-map__canvas"
      >
        <TileLayer
          attribution={`&copy; <a href="https://www.openstreetmap.org/copyright">${t("pages.government.osmAttribution")}</a>`}
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map(({ record, coordinates }) => (
          <CircleMarker
            key={record.id}
            center={[coordinates.lat, coordinates.lng]}
            radius={8}
            pathOptions={{
              color: brandColor,
              fillColor: brandColor,
              fillOpacity: 0.8,
            }}
          >
            <Popup>
              <strong>{record.name}</strong>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
