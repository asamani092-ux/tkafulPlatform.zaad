import { APIProvider, Map as GoogleMap, Circle, InfoWindow } from "@vis.gl/react-google-maps";
import { useState } from "react";
import { GOOGLE_MAPS_API_KEY } from "../../../config";

export interface MapPoint {
  id: number;
  type: string;
  status: string;
  location: string;
  latitude: number;
  longitude: number;
  amount: string;
}

/** خريطة توزيع الكفالات (Google Maps) بألوان design-system. */
export default function SaqyaMap({ points }: { points: MapPoint[] }) {
  const center = points.length
    ? { lat: points[0].latitude, lng: points[0].longitude }
    : { lat: 24.7136, lng: 46.6753 };
  const [activeId, setActiveId] = useState<number | null>(null);
  const active = points.find((p) => p.id === activeId) ?? null;

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div
        style={{
          height: "420px",
          borderRadius: "0.75rem",
          overflow: "hidden",
          border: "2px solid var(--tmkeen-surface-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          textAlign: "center",
          color: "var(--tmkeen-brand-gray)",
          fontSize: "0.875rem",
        }}
        role="status"
      >
        تعذّر عرض الخريطة — أضف مفتاح Google Maps في المتغيّر VITE_GOOGLE_MAPS_API_KEY.
      </div>
    );
  }

  return (
    <div style={{ height: "420px", borderRadius: "0.75rem", overflow: "hidden", border: "2px solid var(--tmkeen-surface-border)" }}>
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY} language="ar" region="SA">
        <GoogleMap
          defaultCenter={center}
          defaultZoom={6}
          gestureHandling="greedy"
          disableDefaultUI={false}
          style={{ height: "100%", width: "100%" }}
        >
          {points.map((p) => (
            <Circle
              key={p.id}
              center={{ lat: p.latitude, lng: p.longitude }}
              radius={220}
              strokeColor="#8B1538"
              fillColor="#8B1538"
              fillOpacity={0.7}
              strokeWeight={1}
              onClick={() => setActiveId(p.id)}
            />
          ))}
          {active && (
            <InfoWindow
              position={{ lat: active.latitude, lng: active.longitude }}
              onCloseClick={() => setActiveId(null)}
            >
              <div dir="rtl">
                <strong>{active.type}</strong>
                <br />
                {active.location}
                <br />
                {Number(active.amount).toLocaleString("en-US")} ر.س · {active.status}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </APIProvider>
    </div>
  );
}
