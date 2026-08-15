/**
 * utils/geocoding.ts
 * CSV parsing for orders + pincodes, Nominatim fallback geocoding
 */

import type { Order, PincodeRecord, RawOrderRow, RawPincodeRow } from '../types';

// ─── Built-in Mumbai area pincode database ───────────────────────────────────
export const BUILTIN_PINCODES: PincodeRecord[] = [
  { pincode: '400001', area_name: 'Fort', lat: 18.9322, lng: 72.8264 },
  { pincode: '400002', area_name: 'Mandvi', lat: 18.9512, lng: 72.8385 },
  { pincode: '400003', area_name: 'Masjid Bunder', lat: 18.9583, lng: 72.8382 },
  { pincode: '400004', area_name: 'Girgaon', lat: 18.9612, lng: 72.8163 },
  { pincode: '400005', area_name: 'Colaba', lat: 18.9067, lng: 72.8147 },
  { pincode: '400006', area_name: 'Malabar Hill', lat: 18.9584, lng: 72.7989 },
  { pincode: '400007', area_name: 'Grant Road', lat: 18.9630, lng: 72.8152 },
  { pincode: '400008', area_name: 'Mumbai Central', lat: 18.9698, lng: 72.8197 },
  { pincode: '400009', area_name: 'Mazagaon', lat: 18.9647, lng: 72.8456 },
  { pincode: '400010', area_name: 'Byculla', lat: 18.9761, lng: 72.8392 },
  { pincode: '400011', area_name: 'Parel', lat: 19.0000, lng: 72.8419 },
  { pincode: '400012', area_name: 'Lalbaug', lat: 19.0062, lng: 72.8358 },
  { pincode: '400013', area_name: 'Dadar', lat: 19.0178, lng: 72.8478 },
  { pincode: '400014', area_name: 'Shivaji Park', lat: 19.0289, lng: 72.8387 },
  { pincode: '400015', area_name: 'Worli', lat: 19.0132, lng: 72.8185 },
  { pincode: '400016', area_name: 'Mahim', lat: 19.0398, lng: 72.8394 },
  { pincode: '400017', area_name: 'Dharavi', lat: 19.0476, lng: 72.8556 },
  { pincode: '400018', area_name: 'Wadala', lat: 19.0202, lng: 72.8617 },
  { pincode: '400019', area_name: 'King Circle', lat: 19.0340, lng: 72.8600 },
  { pincode: '400020', area_name: 'Churchgate', lat: 18.9345, lng: 72.8258 },
  { pincode: '400021', area_name: 'Cuffe Parade', lat: 18.9090, lng: 72.8200 },
  { pincode: '400022', area_name: 'Sion', lat: 19.0401, lng: 72.8636 },
  { pincode: '400024', area_name: 'Chembur', lat: 19.0573, lng: 72.9013 },
  { pincode: '400025', area_name: 'Prabhadevi', lat: 19.0144, lng: 72.8269 },
  { pincode: '400026', area_name: 'Lower Parel', lat: 18.9944, lng: 72.8294 },
  { pincode: '400028', area_name: 'Matunga', lat: 19.0389, lng: 72.8530 },
  { pincode: '400029', area_name: 'Sion East', lat: 19.0420, lng: 72.8680 },
  { pincode: '400030', area_name: 'Sewri', lat: 19.0072, lng: 72.8567 },
  { pincode: '400031', area_name: 'Lalbaug East', lat: 19.0095, lng: 72.8402 },
  { pincode: '400033', area_name: 'Reay Road', lat: 18.9818, lng: 72.8480 },
  { pincode: '400034', area_name: 'Dockyard Road', lat: 18.9700, lng: 72.8487 },
  { pincode: '400037', area_name: 'Govandi', lat: 19.0649, lng: 72.9093 },
  { pincode: '400043', area_name: 'Ghatkopar West', lat: 19.0865, lng: 72.9075 },
  { pincode: '400051', area_name: 'Bandra West', lat: 19.0596, lng: 72.8295 },
  { pincode: '400052', area_name: 'Santacruz West', lat: 19.0816, lng: 72.8396 },
  { pincode: '400053', area_name: 'Juhu', lat: 19.1075, lng: 72.8263 },
  { pincode: '400054', area_name: 'Santacruz East', lat: 19.0845, lng: 72.8560 },
  { pincode: '400055', area_name: 'Vile Parle West', lat: 19.0989, lng: 72.8350 },
  { pincode: '400056', area_name: 'Andheri West', lat: 19.1197, lng: 72.8468 },
  { pincode: '400057', area_name: 'Andheri East', lat: 19.1143, lng: 72.8670 },
  { pincode: '400058', area_name: 'Jogeshwari West', lat: 19.1411, lng: 72.8396 },
  { pincode: '400059', area_name: 'Jogeshwari East', lat: 19.1378, lng: 72.8587 },
  { pincode: '400060', area_name: 'Goregaon West', lat: 19.1571, lng: 72.8490 },
  { pincode: '400061', area_name: 'Goregaon East', lat: 19.1608, lng: 72.8676 },
  { pincode: '400062', area_name: 'Malad West', lat: 19.1862, lng: 72.8484 },
  { pincode: '400063', area_name: 'Malad East', lat: 19.1895, lng: 72.8673 },
  { pincode: '400064', area_name: 'Kandivali West', lat: 19.2071, lng: 72.8471 },
  { pincode: '400065', area_name: 'Borivali West', lat: 19.2310, lng: 72.8567 },
  { pincode: '400066', area_name: 'Borivali East', lat: 19.2334, lng: 72.8710 },
  { pincode: '400067', area_name: 'Kandivali East', lat: 19.2042, lng: 72.8706 },
  { pincode: '400068', area_name: 'Dahisar', lat: 19.2523, lng: 72.8593 },
  { pincode: '400069', area_name: 'Mira Road', lat: 19.2812, lng: 72.8703 },
  { pincode: '400070', area_name: 'Ghatkopar East', lat: 19.0797, lng: 72.9136 },
  { pincode: '400071', area_name: 'Bhandup West', lat: 19.1477, lng: 72.9284 },
  { pincode: '400072', area_name: 'Saki Naka', lat: 19.1012, lng: 72.8869 },
  { pincode: '400074', area_name: 'Mankhurd', lat: 19.0469, lng: 72.9246 },
  { pincode: '400075', area_name: 'Kurla West', lat: 19.0726, lng: 72.8797 },
  { pincode: '400076', area_name: 'Kurla East', lat: 19.0784, lng: 72.8897 },
  { pincode: '400077', area_name: 'Bandra East', lat: 19.0569, lng: 72.8488 },
  { pincode: '400078', area_name: 'Vikhroli West', lat: 19.1066, lng: 72.9214 },
  { pincode: '400079', area_name: 'Vikhroli East', lat: 19.1072, lng: 72.9310 },
  { pincode: '400080', area_name: 'Mulund West', lat: 19.1748, lng: 72.9538 },
  { pincode: '400081', area_name: 'Mulund East', lat: 19.1787, lng: 72.9664 },
  { pincode: '400082', area_name: 'Bhandup East', lat: 19.1504, lng: 72.9437 },
  { pincode: '400083', area_name: 'Powai', lat: 19.1176, lng: 72.9060 },
  { pincode: '400084', area_name: 'Khar West', lat: 19.0708, lng: 72.8328 },
  { pincode: '400085', area_name: 'Santacruz East (P.O.)', lat: 19.0878, lng: 72.8611 },
  { pincode: '400086', area_name: 'Vile Parle East', lat: 19.1019, lng: 72.8579 },
  { pincode: '400087', area_name: 'Chakala', lat: 19.1061, lng: 72.8759 },
  { pincode: '400088', area_name: 'MIDC Andheri', lat: 19.1143, lng: 72.8820 },
  { pincode: '400090', area_name: 'Jogeshwari (RS)', lat: 19.1436, lng: 72.8489 },
  { pincode: '400093', area_name: 'Borivali (RS)', lat: 19.2278, lng: 72.8628 },
  { pincode: '400097', area_name: 'Santacruz (Cargo)', lat: 19.0916, lng: 72.8480 },
  { pincode: '400098', area_name: 'Goregaon (RS)', lat: 19.1556, lng: 72.8490 },
  { pincode: '400101', area_name: 'Vasai West', lat: 19.3602, lng: 72.8007 },
  { pincode: '400601', area_name: 'Thane West', lat: 19.2183, lng: 72.9781 },
  { pincode: '400602', area_name: 'Thane East', lat: 19.2155, lng: 73.0010 },
  { pincode: '400603', area_name: 'Kalwa', lat: 19.1874, lng: 73.0100 },
  { pincode: '400604', area_name: 'Mumbra', lat: 19.1860, lng: 73.0261 },
  { pincode: '400605', area_name: 'Diva', lat: 19.2072, lng: 73.0379 },
  { pincode: '400606', area_name: 'Airoli', lat: 19.1580, lng: 72.9990 },
  { pincode: '400607', area_name: 'Ghansoli', lat: 19.1283, lng: 73.0037 },
  { pincode: '400608', area_name: 'Kopar Khairane', lat: 19.1014, lng: 73.0083 },
  { pincode: '400701', area_name: 'Navi Mumbai CBD', lat: 19.0330, lng: 73.0297 },
  { pincode: '400703', area_name: 'Belapur', lat: 19.0174, lng: 73.0390 },
  { pincode: '400705', area_name: 'Kharghar', lat: 19.0477, lng: 73.0691 },
  { pincode: '400706', area_name: 'Panvel', lat: 18.9894, lng: 73.1098 },
  { pincode: '400708', area_name: 'Vashi', lat: 19.0771, lng: 72.9988 },
];

// ─── CSV Parser ───────────────────────────────────────────────────────────────

/** Parse a CSV string into array of objects (first row = headers) */
export function parseCSV(text: string): RawOrderRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return lines.slice(1).map((line) => {
    const values = splitCSVLine(line);
    const row: RawOrderRow = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] ?? '').trim();
    });
    return row;
  });
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += line[i];
    }
  }
  result.push(current);
  return result;
}

// ─── Order CSV mapper ─────────────────────────────────────────────────────────

const ORDER_FIELD_MAP: Record<string, string[]> = {
  order_id: ['order_id', 'orderid', 'id', 'order_no', 'orderno', 'order_number'],
  customer_name: ['customer_name', 'customername', 'name', 'customer'],
  pincode: ['pincode', 'pin_code', 'pin', 'postal_code', 'postcode', 'zip'],
  area_name: ['area_name', 'area', 'locality', 'neighbourhood', 'zone_name'],
  address: ['address', 'delivery_address', 'addr', 'full_address'],
  order_date: ['order_date', 'orderdate', 'date', 'created_at', 'created_date'],
  status: ['status', 'order_status', 'delivery_status'],
  priority: ['priority', 'order_priority'],
  weight: ['weight', 'weight_kg', 'kg', 'mass'],
};

function findField(row: RawOrderRow, aliases: string[]): string {
  for (const alias of aliases) {
    if (row[alias] !== undefined) return row[alias] ?? '';
  }
  return '';
}

export function mapRowToOrder(row: RawOrderRow, index: number): Order {
  const orderId = findField(row, ORDER_FIELD_MAP.order_id) || `ORD-${Date.now()}-${index}`;
  const rawStatus = findField(row, ORDER_FIELD_MAP.status);
  const rawPriority = findField(row, ORDER_FIELD_MAP.priority);
  const validStatuses = ['Pending', 'Allocated', 'In Transit', 'Delivered', 'Failed'];
  const validPriorities = ['Low', 'Normal', 'High', 'Urgent'];

  return {
    order_id: orderId,
    customer_name: findField(row, ORDER_FIELD_MAP.customer_name) || 'Unknown',
    pincode: findField(row, ORDER_FIELD_MAP.pincode),
    area_name: findField(row, ORDER_FIELD_MAP.area_name),
    address: findField(row, ORDER_FIELD_MAP.address),
    order_date: findField(row, ORDER_FIELD_MAP.order_date) || new Date().toISOString().split('T')[0],
    status: (validStatuses.includes(rawStatus) ? rawStatus : 'Pending') as Order['status'],
    priority: (validPriorities.includes(rawPriority) ? rawPriority : 'Normal') as Order['priority'],
    weight: parseFloat(findField(row, ORDER_FIELD_MAP.weight)) || 1,
  };
}

// ─── Pincode CSV mapper ───────────────────────────────────────────────────────

export function mapRowToPincode(row: RawPincodeRow): PincodeRecord | null {
  const pincode = (row['pincode'] ?? row['pin_code'] ?? row['pin'] ?? '').trim();
  const lat = parseFloat(row['lat'] ?? row['latitude'] ?? row['y'] ?? '');
  const lng = parseFloat(row['lng'] ?? row['lon'] ?? row['longitude'] ?? row['x'] ?? '');
  const area_name = (row['area_name'] ?? row['area'] ?? row['name'] ?? '').trim();

  if (!pincode || isNaN(lat) || isNaN(lng)) return null;
  return { pincode, area_name, lat, lng };
}

// ─── Nominatim geocoder (rate-limited: 1 req/sec) ────────────────────────────

const geocodeCache = new Map<string, { lat: number; lng: number }>();

export async function geocodePincode(
  pincode: string,
  countryCode = 'IN'
): Promise<{ lat: number; lng: number } | null> {
  if (geocodeCache.has(pincode)) return geocodeCache.get(pincode)!;

  // Check built-in database first
  const builtin = BUILTIN_PINCODES.find((p) => p.pincode === pincode);
  if (builtin) {
    const result = { lat: builtin.lat, lng: builtin.lng };
    geocodeCache.set(pincode, result);
    return result;
  }

  // Nominatim fallback
  try {
    await new Promise((r) => setTimeout(r, 1100)); // rate limit
    const url = `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=${countryCode}&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    if (data && data.length > 0) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache.set(pincode, result);
      return result;
    }
  } catch {
    // silently fail
  }
  return null;
}

/** Enrich orders with lat/lng from pincode lookup */
export async function enrichOrdersWithCoords(
  orders: Order[],
  pincodeMap: Map<string, PincodeRecord>,
  onProgress?: (done: number, total: number) => void
): Promise<Order[]> {
  const enriched: Order[] = [];
  let done = 0;
  for (const order of orders) {
    const record = pincodeMap.get(order.pincode);
    if (record) {
      enriched.push({ ...order, lat: record.lat, lng: record.lng, area_name: order.area_name || record.area_name });
    } else {
      const coords = await geocodePincode(order.pincode);
      enriched.push(coords ? { ...order, ...coords } : { ...order });
    }
    done++;
    onProgress?.(done, orders.length);
  }
  return enriched;
}
