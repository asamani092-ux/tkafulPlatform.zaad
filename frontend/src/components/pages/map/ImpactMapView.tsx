import { MapContainer, TileLayer, CircleMarker, Popup, Polygon } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { MapRegion, MapMarker, MapLayerConf, MapProduct } from "./types";
import { PRIORITY_COLORS, PRIORITY_LABELS } from "./types";
import { getMapIcon } from "./icons";

interface Props {
  regions: MapRegion[];
  markers: MapMarker[];
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

/** خريطة متعددة المشاريع — مناطق (بألوان الأولوية) + علامات المشروع (بأيقونة/لون كل طبقة). */
export default function ImpactMapView({ regions, markers, selectedSlug, onSelectRegion, projectColor = "#8B1538" }: Props) {
  const center: [number, number] = regions.length
    ? [regions[0].center_lat, regions[0].center_lng]
    : markers.length
      ? [markers[0].lat, markers[0].lng]
      : [24.7136, 46.6753];

  return (
    <div className="impact-map-container" style={{ height: "min(420px, 55vh)", borderRadius: "0.75rem", overflow: "hidden", border: "2px solid var(--tmkeen-surface-border)" }}>
      <MapContainer center={center} zoom={10} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {regions.map((r) => {
          const color = PRIORITY_COLORS[r.priority] || projectColor;
          const poly = parseBoundary(r.boundary);
          const selected = r.slug === selectedSlug;
          if (poly && poly.length > 2) {
            return (
              <Polygon key={r.id} positions={poly}
                pathOptions={{ color, fillColor: color, fillOpacity: selected ? 0.55 : 0.35, weight: selected ? 3 : 1 }}
                eventHandlers={{ click: () => onSelectRegion(r.slug) }}>
                <Popup><div dir="rtl"><strong>{r.name}</strong><br />{PRIORITY_LABELS[r.priority]}</div></Popup>
              </Polygon>
            );
          }
          return (
            <CircleMarker key={r.id} center={[r.center_lat, r.center_lng]} radius={selected ? 14 : 10}
              pathOptions={{ color, fillColor: color, fillOpacity: selected ? 0.85 : 0.65, weight: selected ? 3 : 1 }}
              eventHandlers={{ click: () => onSelectRegion(r.slug) }}>
              <Popup><div dir="rtl"><strong>{r.name}</strong><br />{PRIORITY_LABELS[r.priority]}</div></Popup>
            </CircleMarker>
          );
        })}
        {markers.map((m) => {
          const color = m.color || projectColor;
          return (
            <CircleMarker key={m.id} center={[m.lat, m.lng]} radius={6}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.9 }}>
              <Popup>
                <div dir="rtl">
                  <strong>{m.name}</strong>
                  {m.address ? <><br />{m.address}</> : null}
                  {m.working_hours ? <><br />{m.working_hours}</> : null}
                  {m.beneficiaries !== undefined ? <><br />المستفيدون: {m.beneficiaries}</> : null}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

/** مفتاح الطبقات لكل مشروع (أيقونة + لون + اسم الطبقة). */
export function MapLegend({ layers }: { layers: MapLayerConf[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
      {layers.map((l) => {
        const Icon = getMapIcon(l.icon_key);
        return (
          <span key={`${l.layer_key}-${l.marker_type}`} className="flex items-center gap-1">
            <Icon size={14} style={{ color: l.color }} />
            {l.label || l.layer_key}
          </span>
        );
      })}
    </div>
  );
}

export function ProductChips({ products, active, onChange }: { products: MapProduct[]; active: string | null; onChange: (slug: string | null) => void }) {
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      <button type="button" className={`rounded-full px-3 py-1 text-xs font-bold${!active ? " bg-primary text-white" : " bg-surface border border-surface-border"}`}
        onClick={() => onChange(null)}>الكل</button>
      {products.map((p) => (
        <button key={p.slug} type="button"
          className={`rounded-full px-3 py-1 text-xs font-bold${active === p.slug ? " bg-primary text-white" : " bg-surface border border-surface-border"}`}
          onClick={() => onChange(active === p.slug ? null : p.slug)}>
          {p.icon} {p.name}
        </button>
      ))}
    </div>
  );
}
