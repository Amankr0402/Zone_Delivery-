import React, { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import type { Zone, Order, PincodeRecord } from '../types';

interface ZoneMapProps {
  zones: Zone[];
  orders: Order[];
  pincodes: PincodeRecord[];
  height?: number;
  showOrders?: boolean;
  selectedZone?: string | null;
  onZoneClick?: (zone_id: string) => void;
}

const MUMBAI_CENTER: [number, number] = [19.076, 72.877];

export default function ZoneMap({
  zones,
  orders,
  pincodes,
  height = 450,
  showOrders = true,
  selectedZone,
  onZoneClick,
}: ZoneMapProps) {
  // Build pincode → zone color map
  const pincodeZoneColor = useMemo(() => {
    const map = new Map<string, { color: string; zone_id: string; zone_name: string }>();
    for (const z of zones) {
      for (const pin of z.pincodes) {
        map.set(pin, { color: z.color, zone_id: z.zone_id, zone_name: z.zone_name });
      }
    }
    return map;
  }, [zones]);

  // Pincode markers
  const pincodeMarkers = useMemo(() => {
    const pincodeMap = new Map(pincodes.map((p) => [p.pincode, p]));
    const uniquePins = new Set<string>();
    const markers: { pincode: string; lat: number; lng: number; area: string; color: string; zone_name: string; zone_id: string; orderCount: number }[] = [];

    for (const z of zones) {
      for (const pin of z.pincodes) {
        if (uniquePins.has(pin)) continue;
        uniquePins.add(pin);
        const rec = pincodeMap.get(pin);
        const order = orders.find((o) => o.pincode === pin);
        const lat = rec?.lat ?? order?.lat;
        const lng = rec?.lng ?? order?.lng;
        if (lat == null || lng == null) continue;
        const orderCount = orders.filter((o) => o.pincode === pin).length;
        markers.push({
          pincode: pin,
          lat,
          lng,
          area: rec?.area_name ?? order?.area_name ?? pin,
          color: z.color,
          zone_name: z.zone_name,
          zone_id: z.zone_id,
          orderCount,
        });
      }
    }
    return markers;
  }, [zones, orders, pincodes]);

  // Zone centroids
  const centroids = zones.filter((z) => z.centroid_lat && z.centroid_lng);

  // Determine map center
  const center: [number, number] = centroids.length > 0
    ? [centroids[0].centroid_lat, centroids[0].centroid_lng]
    : pincodeMarkers.length > 0
    ? [pincodeMarkers[0].lat, pincodeMarkers[0].lng]
    : MUMBAI_CENTER;

  return (
    <div className="map-container" style={{ height }}>
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Zone centroid markers — larger */}
        {centroids.map((z) => (
          <CircleMarker
            key={`centroid-${z.zone_id}`}
            center={[z.centroid_lat, z.centroid_lng]}
            radius={14}
            pathOptions={{
              fillColor: z.color,
              fillOpacity: 0.25,
              color: z.color,
              weight: 2,
              opacity: 0.5,
            }}
            eventHandlers={{
              click: () => onZoneClick?.(z.zone_id),
            }}
          >
            <Tooltip permanent direction="center" className="zone-label-tooltip">
              <span style={{ fontWeight: 700, fontSize: '0.7rem', color: z.color }}>{z.zone_name}</span>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* Pincode markers */}
        {pincodeMarkers.map((m) => (
          <CircleMarker
            key={`pin-${m.pincode}`}
            center={[m.lat, m.lng]}
            radius={selectedZone && m.zone_id !== selectedZone ? 3 : Math.min(5 + m.orderCount, 10)}
            pathOptions={{
              fillColor: m.color,
              fillOpacity: selectedZone && m.zone_id !== selectedZone ? 0.15 : 0.7,
              color: m.color,
              weight: 1.5,
              opacity: selectedZone && m.zone_id !== selectedZone ? 0.2 : 0.9,
            }}
            eventHandlers={{
              click: () => onZoneClick?.(m.zone_id),
            }}
          >
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem' }}>
                <strong style={{ fontSize: '0.85rem' }}>{m.area}</strong>
                <div style={{ marginTop: 4, color: '#666' }}>
                  Pincode: {m.pincode}<br />
                  Zone: <span style={{ color: m.color, fontWeight: 600 }}>{m.zone_name}</span><br />
                  Orders: <strong>{m.orderCount}</strong>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Individual order markers (tiny dots) */}
        {showOrders && orders.filter((o) => o.lat && o.lng).map((o) => {
          const zInfo = pincodeZoneColor.get(o.pincode);
          if (selectedZone && zInfo?.zone_id !== selectedZone) return null;
          return (
            <CircleMarker
              key={`order-${o.order_id}`}
              center={[o.lat!, o.lng!]}
              radius={2}
              pathOptions={{
                fillColor: zInfo?.color ?? '#6b71a0',
                fillOpacity: 0.5,
                color: 'transparent',
                weight: 0,
              }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
