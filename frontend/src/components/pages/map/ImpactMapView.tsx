import { MapContainer, TileLayer, CircleMarker, Popup, Polygon } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { MapRegion, MapOutlet, MapProduct } from "./types";
import { PRIORITY_COLORS, PRIORITY_LABELS, OUTLET_COLORS, OUTLET_LABELS } from "./types";

interface Props {
  regions: MapRegion[];
  outlets: MapOutlet[];
  selectedSlug: string | null;
  productFilter: string | null;
  onSelectRegion: (slug: string) => void;
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

/** خريطة المناطق والمنافذ — ألوان حسب الأولوية/النوع. */
export default function ImpactMapView({ regions, outlets, selectedSlug, productFilter, onSelectRegion }: Props) {
  const center: [number, number] = regions.length
    ? [regions[0].center_lat, regions[0].center_lng]
    : [24.7136, 46.6753];

  const filteredOutlets = productFilter
    ? outlets
    : outlets;

  return (
    <div className="impact-map-container" style={{ height: "min(420px, 55vh)", borderRadius: "0.75rem", overflow: "hidden", border: "2px solid var(--tmkeen-surface-border)" }}>
      <MapContainer center={center} zoom={10} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {regions.map((r) => {
          const color = PRIORITY_COLORS[r.priority];
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
        {filteredOutlets.map((o) => (
          <CircleMarker key={`o-${o.id}`} center={[o.lat, o.lng]} radius={6}
            pathOptions={{ color: OUTLET_COLORS[o.type], fillColor: OUTLET_COLORS[o.type], fillOpacity: 0.9 }}>
            <Popup>
              <div dir="rtl">
                <strong>{o.name}</strong><br />
                {OUTLET_LABELS[o.type]}<br />
                {o.address}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

export function MapLegend() {
  return (
    <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
      {(Object.keys(PRIORITY_COLORS) as Array<keyof typeof PRIORITY_COLORS>).map((p) => (
        <span key={p} className="flex items-center gap-1">
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: PRIORITY_COLORS[p], display: "inline-block" }} />
          {PRIORITY_LABELS[p]}
        </span>
      ))}
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
