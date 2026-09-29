import { MapContainer, TileLayer, CircleMarker, Popup, Polygon } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { MapRegion, MapOutlet } from "./types";
import { PRIORITY_COLORS, PRIORITY_LABELS } from "./types";

interface Props {
  regions: MapRegion[];
  outlets: MapOutlet[];
  selectedSlug: string | null;
  onSelectRegion: (slug: string) => void;
  projectColor?: string;
}

function parseBoundary(raw: string | null): [number, number][] | null {
  if (!raw) return null;
  try {
    const geo = JSON.parse(raw);
    const coords = geo?.coordinates?.[0];
    if (!Array.isArray(coords)) return null;
    return coords.map((c: number[]) => [c[1], c[0]] as [number, number]);
  } catch {
    return null;
  }
}

/** خريطة Leaflet للأثر (تفقدهم) — بدون geolocation في المتصفح. */
export default function ImpactMapView({
  regions,
  outlets,
  selectedSlug,
  onSelectRegion,
  projectColor = "#8B1538",
}: Props) {
  const center: [number, number] = regions.length
    ? [regions[0].center_lat, regions[0].center_lng]
    : outlets.length
      ? [outlets[0].lat, outlets[0].lng]
      : [24.7136, 46.6753];

  return (
    <div
      className="impact-map-container"
      style={{
        height: "min(420px, 55vh)",
        borderRadius: "0.75rem",
        overflow: "hidden",
        border: "2px solid var(--tmkeen-surface-border)",
      }}
    >
      <MapContainer center={center} zoom={10} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {regions.map((r) => {
          const color = PRIORITY_COLORS[r.priority] || projectColor;
          const poly = parseBoundary(r.boundary);
          const selected = r.slug === selectedSlug;
          if (poly && poly.length > 2) {
            return (
              <Polygon
                key={r.id}
                positions={poly}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: selected ? 0.55 : 0.35,
                  weight: selected ? 3 : 1,
                }}
                eventHandlers={{ click: () => onSelectRegion(r.slug) }}
              >
                <Popup>
                  <div dir="rtl">
                    <strong>{r.name}</strong>
                    <br />
                    {PRIORITY_LABELS[r.priority]}
                  </div>
                </Popup>
              </Polygon>
            );
          }
          return (
            <CircleMarker
              key={r.id}
              center={[r.center_lat, r.center_lng]}
              radius={selected ? 14 : 10}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: selected ? 0.85 : 0.65,
                weight: selected ? 3 : 1,
              }}
              eventHandlers={{ click: () => onSelectRegion(r.slug) }}
            >
              <Popup>
                <div dir="rtl">
                  <strong>{r.name}</strong>
                  <br />
                  {PRIORITY_LABELS[r.priority]}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
        {outlets.map((m) => (
          <CircleMarker
            key={m.id}
            center={[m.lat, m.lng]}
            radius={6}
            pathOptions={{ color: projectColor, fillColor: projectColor, fillOpacity: 0.9 }}
          >
            <Popup>
              <div dir="rtl">
                <strong>{m.name}</strong>
                {m.address ? <><br />{m.address}</> : null}
                {m.working_hours ? <><br />{m.working_hours}</> : null}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
