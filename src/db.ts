/**
 * db.ts — localStorage data layer
 * All data access goes through this module so the backend can be swapped later.
 */

import type {
  Order, PincodeRecord, Zone, Vehicle, Assignment, WeeklySlot
} from './types';

// ─── Keys ────────────────────────────────────────────────────────────────────
const KEYS = {
  orders: 'zdp_orders',
  pincodes: 'zdp_pincodes',
  zones: 'zdp_zones',
  vehicles: 'zdp_vehicles',
  assignments: 'zdp_assignments',
  weeklySlots: 'zdp_weekly_slots',
} as const;

// ─── Generic helpers ──────────────────────────────────────────────────────────
function load<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── Orders ──────────────────────────────────────────────────────────────────
export const db = {
  // Orders
  getOrders: (): Order[] => load<Order>(KEYS.orders),
  saveOrders: (orders: Order[]) => save(KEYS.orders, orders),
  addOrders: (newOrders: Order[]) => {
    const existing = load<Order>(KEYS.orders);
    const existingIds = new Set(existing.map((o) => o.order_id));
    const merged = [...existing, ...newOrders.filter((o) => !existingIds.has(o.order_id))];
    save(KEYS.orders, merged);
    return merged;
  },
  clearOrders: () => localStorage.removeItem(KEYS.orders),
  deleteOrder: (order_id: string) => {
    const orders = load<Order>(KEYS.orders).filter((o) => o.order_id !== order_id);
    save(KEYS.orders, orders);
  },
  updateOrder: (updated: Order) => {
    const orders = load<Order>(KEYS.orders).map((o) =>
      o.order_id === updated.order_id ? updated : o
    );
    save(KEYS.orders, orders);
  },

  // Pincodes
  getPincodes: (): PincodeRecord[] => load<PincodeRecord>(KEYS.pincodes),
  savePincodes: (pincodes: PincodeRecord[]) => save(KEYS.pincodes, pincodes),
  addPincodes: (newPins: PincodeRecord[]) => {
    const existing = load<PincodeRecord>(KEYS.pincodes);
    const existingPins = new Set(existing.map((p) => p.pincode));
    const merged = [...existing, ...newPins.filter((p) => !existingPins.has(p.pincode))];
    save(KEYS.pincodes, merged);
    return merged;
  },
  clearPincodes: () => localStorage.removeItem(KEYS.pincodes),

  // Zones
  getZones: (): Zone[] => load<Zone>(KEYS.zones),
  saveZones: (zones: Zone[]) => save(KEYS.zones, zones),
  upsertZone: (zone: Zone) => {
    const zones = load<Zone>(KEYS.zones);
    const idx = zones.findIndex((z) => z.zone_id === zone.zone_id);
    if (idx >= 0) zones[idx] = zone;
    else zones.push(zone);
    save(KEYS.zones, zones);
  },
  deleteZone: (zone_id: string) => {
    const zones = load<Zone>(KEYS.zones).filter((z) => z.zone_id !== zone_id);
    save(KEYS.zones, zones);
  },
  clearZones: () => localStorage.removeItem(KEYS.zones),

  // Vehicles
  getVehicles: (): Vehicle[] => load<Vehicle>(KEYS.vehicles),
  saveVehicles: (vehicles: Vehicle[]) => save(KEYS.vehicles, vehicles),
  upsertVehicle: (vehicle: Vehicle) => {
    const vehicles = load<Vehicle>(KEYS.vehicles);
    const idx = vehicles.findIndex((v) => v.vehicle_id === vehicle.vehicle_id);
    if (idx >= 0) vehicles[idx] = vehicle;
    else vehicles.push(vehicle);
    save(KEYS.vehicles, vehicles);
  },
  deleteVehicle: (vehicle_id: string) => {
    const vehicles = load<Vehicle>(KEYS.vehicles).filter((v) => v.vehicle_id !== vehicle_id);
    save(KEYS.vehicles, vehicles);
  },

  // Assignments
  getAssignments: (): Assignment[] => load<Assignment>(KEYS.assignments),
  saveAssignments: (a: Assignment[]) => save(KEYS.assignments, a),

  // Weekly Schedule Slots
  getWeeklySlots: (): WeeklySlot[] => load<WeeklySlot>(KEYS.weeklySlots),
  saveWeeklySlots: (slots: WeeklySlot[]) => save(KEYS.weeklySlots, slots),
  clearWeeklySlots: () => localStorage.removeItem(KEYS.weeklySlots),

  // Utility
  clearAll: () => Object.values(KEYS).forEach((k) => localStorage.removeItem(k)),
};
