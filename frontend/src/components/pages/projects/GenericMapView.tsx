import { MapContainer, TileLayer, CircleMarker, Popup, Polygon } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { COLOR_SCHEME_LABELS, type PublicMapDetail, type PublicMapItem } from "./types";

interface Props {
  maps: PublicMapDetail[]; // خريطة واحدة أو عدة خرائط (المجمّع الموحّد)
  visibleItems: PublicMapItem[]; // بعد الفلاتر الديناميكية
  selectedItemId: number | null;
  onSelectItem: (id: number) => void;
}

function parseBoundary(raw: unknown): [number, number][] | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const geo = JSON.parse(raw);
    const coords = geo?.coordinates?.[0];
    if (!Array.isArray(coords)) return null;
    return coords.map((c: number[]) => [c[1], c[0]] as [number, number]);
  } catch {
    return null;
  }
}

function itemColor(item: PublicMapItem, detail: PublicMapDetail): string {
  const scheme = detail.color_scheme || {};
  // الترتيب: أولوية المنطقة → نوع المنفذ → نوع العنصر → لون هوية المشروع
  for (const key of ["priority", "outlet_type", "kind"] as const) {
    const value = item.data?.[key];
    if (typeof value === "string" && scheme[value]) return scheme[value];
  }
  return detail.project.brand_color || "#8b1538";
}

/** وسيلة إيضاح مولّدة من color_scheme للخرائط الظاهرة (مفاتيح موحّدة بلا تكرار). */
export function MapLegend({ maps }: { maps: PublicMapDetail[] }) {
  const entries = new Map<string, string>();
  maps.forEach((m) =>
    Object.entries(m.color_scheme || {}).forEach(([key, color]) => {
      if (!entries.has(key) && typeof color === "string") entries.set(key, color);
    }),
  );
  if (!entries.size) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
      {[...entries.entries()].map(([key, color]) => (
        <span key={key} className="flex items-center gap-1">
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: color, display: "inline-block" }} />
          {COLOR_SCHEME_LABELS[key] || key}
        </span>
      ))}
    </div>
  );
}

/** عارض الخرائط العام — يرسم عناصر الطبقات العامة لخريطة أو أكثر (leaflet). */
export default function GenericMapView({ maps, visibleItems, selectedItemId, onSelectItem }: Props) {
  const first = visibleItems[0];
  const center: [number, number] = first ? [first.lat, first.lng] : [24.7136, 46.6753];
  const detailByItem = new Map<number, PublicMapDetail>();
  maps.forEach((m) => m.items.forEach((i) => detailByItem.set(i.id, m)));

  return (
    <div style={{ height: "min(420px, 55vh)", borderRadius: "0.75rem", overflow: "hidden", border: "2px solid var(--tmkeen-surface-border)" }}>
      <MapContainer center={center} zoom={10} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {visibleItems.map((item) => {
          const detail = detailByItem.get(item.id);
          if (!detail) return null;
          const color = itemColor(item, detail);
          const selected = item.id === selectedItemId;
          const poly = parseBoundary(item.data?.boundary);
          const popup = (
            <Popup>
              <div dir="rtl">
                <strong>{item.name}</strong>
                <br />
                {detail.project.name} — {detail.title}
              </div>
            </Popup>
          );
          if (poly && poly.length > 2) {
            return (
              <Polygon key={item.id} positions={poly}
                pathOptions={{ color, fillColor: color, fillOpacity: selected ? 0.55 : 0.35, weight: selected ? 3 : 1 }}
                eventHandlers={{ click: () => onSelectItem(item.id) }}>
                {popup}
              </Polygon>
            );
          }
          return (
            <CircleMarker key={item.id} center={[item.lat, item.lng]} radius={selected ? 13 : 9}
              pathOptions={{ color, fillColor: color, fillOpacity: selected ? 0.85 : 0.65, weight: selected ? 3 : 1 }}
              eventHandlers={{ click: () => onSelectItem(item.id) }}>
              {popup}
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
