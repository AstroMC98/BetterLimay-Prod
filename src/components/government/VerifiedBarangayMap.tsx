import "leaflet/dist/leaflet.css";

import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { useTranslation } from "react-i18next";

import type { VerifiedBarangayMapPoint } from "../../lib/ui/governmentCatalog";

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
            pathOptions={{ color: "#0032A0", fillColor: "#0032A0", fillOpacity: 0.8 }}
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
