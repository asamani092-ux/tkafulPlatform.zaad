import { useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Polygon, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { PublicMapDetail, PublicMapItem } from "./types";

interface Props {
  maps: PublicMapDetail[];
  visibleItems: PublicMapItem[];
  selectedItemId: number | null;
  onSelectItem: (id: number) => void;
}

type LatLng = { lat: number; lng: number };

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
  for (const key of ["priority", "outlet_type", "kind"] as const) {
    const value = item.data?.[key];
    if (typeof value === "string" && scheme[value]) return scheme[value];
  }
  return detail.project.brand_color || "#8b1538";
}

/** عارض Leaflet لنفس عناصر الخرائط الموحّدة — بدون Google Maps. */
export default function LeafletGenericMapView({ maps, visibleItems, selectedItemId, onSelectItem }: Props) {
  const first = visibleItems[0];
  const center: LatLng = first ? { lat: first.lat, lng: first.lng } : { lat: 24.7136, lng: 46.6753 };
  const detailByItem = useMemo(() => {
    const m = new globalThis.Map<number, PublicMapDetail>();
    maps.forEach((detail) => detail.items.forEach((i) => m.set(i.id, detail)));
    return m;
  }, [maps]);
  const [hoverId, setHoverId] = useState<number | null>(null);
  const popupId = selectedItemId ?? hoverId;
  const popupItem = popupId ? visibleItems.find((i) => i.id === popupId) : null;
  const popupDetail = popupItem ? detailByItem.get(popupItem.id) : null;

  return (
    <div
      style={{
        height: "min(420px, 55vh)",
        borderRadius: "0.75rem",
        overflow: "hidden",
        border: "2px solid var(--tmkeen-surface-border)",
      }}
    >
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={10}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {visibleItems.map((item) => {
          const detail = detailByItem.get(item.id);
          if (!detail) return null;
          const color = itemColor(item, detail);
          const selected = item.id === selectedItemId;
          const poly = parseBoundary(item.data?.boundary);
          if (poly && poly.length > 2) {
            return (
              <Polygon
                key={item.id}
                positions={poly}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: selected ? 0.55 : 0.35,
                  weight: selected ? 3 : 1,
                }}
                eventHandlers={{
                  click: () => onSelectItem(item.id),
                  mouseover: () => setHoverId(item.id),
                  mouseout: () => setHoverId((h) => (h === item.id ? null : h)),
                }}
              />
            );
          }
          return (
            <CircleMarker
              key={item.id}
              center={[item.lat, item.lng]}
              radius={selected ? 14 : 10}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: selected ? 0.85 : 0.65,
                weight: selected ? 3 : 1,
              }}
              eventHandlers={{
                click: () => onSelectItem(item.id),
                mouseover: () => setHoverId(item.id),
                mouseout: () => setHoverId((h) => (h === item.id ? null : h)),
              }}
            />
          );
        })}
        {popupItem && popupDetail && (
          <Popup position={[popupItem.lat, popupItem.lng]}>
            <div dir="rtl">
              <strong>{popupItem.name}</strong>
              <br />
              {popupDetail.project.name} — {popupDetail.title}
            </div>
          </Popup>
        )}
      </MapContainer>
    </div>
  );
}
