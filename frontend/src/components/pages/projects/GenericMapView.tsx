import { useMemo, useState } from "react";
import {
  APIProvider,
  Map as GoogleMap,
  Circle,
  Polygon,
  InfoWindow,
} from "@vis.gl/react-google-maps";
import { GOOGLE_MAPS_API_KEY } from "../../../config";
import type { PublicMapDetail, PublicMapItem } from "./types";

interface Props {
  maps: PublicMapDetail[]; // خريطة واحدة أو عدة خرائط (المجمّع الموحّد)
  visibleItems: PublicMapItem[]; // بعد الفلاتر الديناميكية
  selectedItemId: number | null;
  onSelectItem: (id: number) => void;
}

type LatLng = { lat: number; lng: number };

function parseBoundary(raw: unknown): LatLng[] | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const geo = JSON.parse(raw);
    const coords = geo?.coordinates?.[0];
    if (!Array.isArray(coords)) return null;
    return coords.map((c: number[]) => ({ lat: c[1], lng: c[0] }));
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

function MapMissingKey() {
  return (
    <div
      className="flex h-full items-center justify-center px-4 text-center text-sm"
      style={{ minHeight: "min(420px, 55vh)", background: "var(--tmkeen-surface-muted, #f5f5f5)", color: "var(--tmkeen-brand-gray)" }}
      role="status"
    >
      تعذّر عرض الخريطة — أضف مفتاح Google Maps في المتغيّر VITE_GOOGLE_MAPS_API_KEY.
    </div>
  );
}

/** عارض الخرائط العام — Google Maps؛ مركز = أول نقطة ظاهرة وإلا الرياض. */
export default function GenericMapView({ maps, visibleItems, selectedItemId, onSelectItem }: Props) {
  const first = visibleItems[0];
  const center: LatLng = first
    ? { lat: first.lat, lng: first.lng }
    : { lat: 24.7136, lng: 46.6753 };
  const detailByItem = useMemo(() => {
    const m = new globalThis.Map<number, PublicMapDetail>();
    maps.forEach((detail) => detail.items.forEach((i) => m.set(i.id, detail)));
    return m;
  }, [maps]);
  const [hoverId, setHoverId] = useState<number | null>(null);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div style={{ height: "min(420px, 55vh)", borderRadius: "0.75rem", overflow: "hidden", border: "2px solid var(--tmkeen-surface-border)" }}>
        <MapMissingKey />
      </div>
    );
  }

  const popupItem = visibleItems.find((i) => i.id === (selectedItemId ?? hoverId)) ?? null;
  const popupDetail = popupItem ? detailByItem.get(popupItem.id) : null;

  return (
    <div style={{ height: "min(420px, 55vh)", borderRadius: "0.75rem", overflow: "hidden", border: "2px solid var(--tmkeen-surface-border)" }}>
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY} language="ar" region="SA">
        <GoogleMap
          defaultCenter={center}
          defaultZoom={10}
          gestureHandling="greedy"
          disableDefaultUI={false}
          style={{ height: "100%", width: "100%" }}
        >
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
                  paths={poly}
                  strokeColor={color}
                  fillColor={color}
                  fillOpacity={selected ? 0.55 : 0.35}
                  strokeWeight={selected ? 3 : 1}
                  onClick={() => onSelectItem(item.id)}
                  onMouseOver={() => setHoverId(item.id)}
                  onMouseOut={() => setHoverId((h) => (h === item.id ? null : h))}
                />
              );
            }
            return (
              <Circle
                key={item.id}
                center={{ lat: item.lat, lng: item.lng }}
                radius={selected ? 280 : 180}
                strokeColor={color}
                fillColor={color}
                fillOpacity={selected ? 0.85 : 0.65}
                strokeWeight={selected ? 3 : 1}
                onClick={() => onSelectItem(item.id)}
                onMouseOver={() => setHoverId(item.id)}
                onMouseOut={() => setHoverId((h) => (h === item.id ? null : h))}
              />
            );
          })}
          {popupItem && popupDetail && (
            <InfoWindow
              position={{ lat: popupItem.lat, lng: popupItem.lng }}
              onCloseClick={() => setHoverId(null)}
            >
              <div dir="rtl">
                <strong>{popupItem.name}</strong>
                <br />
                {popupDetail.project.name} — {popupDetail.title}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </APIProvider>
    </div>
  );
}
