import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export interface MapPoint {
  id: number; type: string; status: string; location: string;
  latitude: number; longitude: number; amount: string;
}

/** خريطة توزيع الكفالات (react-leaflet) بألوان design-system. */
export default function SaqyaMap({ points }: { points: MapPoint[] }) {
  const center: [number, number] = points.length
    ? [points[0].latitude, points[0].longitude]
    : [24.7136, 46.6753]; // الرياض افتراضياً
  return (
    <div style={{ height: "420px", borderRadius: "0.75rem", overflow: "hidden", border: "2px solid var(--tmkeen-surface-border)" }}>
      <MapContainer center={center} zoom={6} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((p) => (
          <CircleMarker key={p.id} center={[p.latitude, p.longitude]} radius={10}
            pathOptions={{ color: "#8B1538", fillColor: "#8B1538", fillOpacity: 0.7 }}>
            <Popup>
              <div dir="rtl">
                <strong>{p.type}</strong><br />
                {p.location}<br />
                {Number(p.amount).toLocaleString("en-US")} ر.س · {p.status}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
