/**
 * utils/scheduling.ts
 * Vehicle allocation algorithm — weekly schedule generator
 */

import type { Zone, Vehicle, WeeklySlot, ScheduleResult, ScheduleWarning, Day } from '../types';

const ALL_DAYS: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export interface ZoneLoad {
  zone_id: string;
  zone_name: string;
  order_count: number;
  trips_needed: number; // how many vehicle-days needed
}

/**
 * Main scheduling algorithm
 * Returns a weekly matrix of WeeklySlot records plus warnings.
 */
export function generateSchedule(
  zones: Zone[],
  vehicles: Vehicle[],
  weekStart: string, // ISO date string for Monday
  orderCountByZone: Record<string, number>
): ScheduleResult {
  const warnings: ScheduleWarning[] = [];
  const slots: WeeklySlot[] = [];

  if (zones.length === 0 || vehicles.length === 0) {
    return { slots, warnings, coverage: [] };
  }

  // ── 1. Track remaining orders per zone ──────────────────────────────────────
  const zoneLoads: ZoneLoad[] = zones.map((z) => {
    const orders = orderCountByZone[z.zone_id] ?? z.order_count ?? 0;
    return { zone_id: z.zone_id, zone_name: z.zone_name, order_count: orders, trips_needed: 0 };
  });

  const remainingOrders: Map<string, number> = new Map(
    zoneLoads.map((z) => [z.zone_id, z.order_count])
  );

  const coveredTrips: Map<string, number> = new Map(
    zoneLoads.map((z) => [z.zone_id, 0])
  );

  // ── 2. Build vehicle-day slots pool ─────────────────────────────────────────
  interface VehicleDay {
    vehicle_id: string;
    day: Day;
    load: number; // orders assigned
    capacity: number;
  }

  const pool: VehicleDay[] = [];
  for (const v of vehicles) {
    for (const day of ALL_DAYS) {
      if (v.availability.includes(day)) {
        pool.push({ vehicle_id: v.vehicle_id, day, load: 0, capacity: v.capacity });
      }
    }
  }

  // ── 2.5 Driver Affinity Map ─────────────────────────────────────────────────
  // Keeps track of which vehicle was assigned to a zone to prefer continuity
  const zoneAffinity: Map<string, string> = new Map();

  // ── 3. Best-fit bin-packing: assign zones to vehicle-days by matching capacity 
  for (const day of ALL_DAYS) {
    const dayVehicles = pool.filter((vd) => vd.day === day);
    if (dayVehicles.length === 0) continue;

    // Loop until all zones are covered or no vehicles are left
    while (dayVehicles.length > 0) {
      // Find zones that still need orders covered, sorted by remaining load (highest first)
      const pendingZones = zoneLoads
        .filter((z) => (remainingOrders.get(z.zone_id) ?? 0) > 0)
        .sort((a, b) => (remainingOrders.get(b.zone_id) ?? 0) - (remainingOrders.get(a.zone_id) ?? 0));

      if (pendingZones.length === 0) {
        break; // No more zones need capacity today
      }

      const zoneLoad = pendingZones[0];
      const needed = remainingOrders.get(zoneLoad.zone_id) ?? 0;
      const affinityVehicleId = zoneAffinity.get(zoneLoad.zone_id);

      // Sort remaining vehicles by capacity ascending to find the smallest one that fits
      dayVehicles.sort((a, b) => a.capacity - b.capacity);
      
      let selectedVehicleIndex = -1;

      // First priority: Try to use the same vehicle (affinity) if it's available today
      // AND its capacity is enough to cover the remaining orders.
      if (affinityVehicleId) {
        const affinityIdx = dayVehicles.findIndex(v => v.vehicle_id === affinityVehicleId);
        if (affinityIdx !== -1 && dayVehicles[affinityIdx].capacity >= needed) {
          selectedVehicleIndex = affinityIdx;
        }
      }

      // Second priority: If no valid affinity match, find the smallest vehicle that fits
      if (selectedVehicleIndex === -1) {
        for (let i = 0; i < dayVehicles.length; i++) {
          if (dayVehicles[i].capacity >= needed) {
            selectedVehicleIndex = i;
            break;
          }
        }
      }

      // Third priority: If no vehicle is big enough to cover all 'needed' orders,
      // fallback to the affinity vehicle if it's available (to keep continuity),
      // otherwise just pick the largest available vehicle to take the biggest chunk out.
      if (selectedVehicleIndex === -1) {
        if (affinityVehicleId) {
          const affinityIdx = dayVehicles.findIndex(v => v.vehicle_id === affinityVehicleId);
          if (affinityIdx !== -1) {
            selectedVehicleIndex = affinityIdx;
          }
        }
        if (selectedVehicleIndex === -1) {
          selectedVehicleIndex = dayVehicles.length - 1; // largest vehicle
        }
      }

      const vehicle = dayVehicles[selectedVehicleIndex];
      zoneAffinity.set(zoneLoad.zone_id, vehicle.vehicle_id);

      // Assign the vehicle
      slots.push({
        slot_id: uid(),
        week_start: weekStart,
        vehicle_id: vehicle.vehicle_id,
        day,
        zone_id: zoneLoad.zone_id,
        is_manual_override: false,
      });

      remainingOrders.set(zoneLoad.zone_id, Math.max(0, needed - vehicle.capacity));
      coveredTrips.set(zoneLoad.zone_id, (coveredTrips.get(zoneLoad.zone_id) ?? 0) + 1);

      // Remove assigned vehicle from today's pool
      dayVehicles.splice(selectedVehicleIndex, 1);
    }

    // Any vehicles left over for today are idle
    for (const vehicle of dayVehicles) {
      slots.push({
        slot_id: uid(),
        week_start: weekStart,
        vehicle_id: vehicle.vehicle_id,
        day,
        zone_id: null,
        is_manual_override: false,
        notes: 'Idle',
      });
    }
  }

  // ── 4. Check for uncovered zones and calculate capacity warnings ─────────────
  const maxCap = Math.max(...vehicles.map((v) => v.capacity), 1);
  
  const coverage = zoneLoads.map((z) => {
    const remaining = remainingOrders.get(z.zone_id) ?? 0;
    const covered = coveredTrips.get(z.zone_id) ?? 0;
    // Calculate days_needed based on what was covered plus what is left
    // (using max capacity as an estimate for remaining trips needed)
    const needed = covered + Math.ceil(remaining / maxCap);
    return {
      zone_id: z.zone_id,
      days_covered: covered,
      days_needed: needed,
    };
  });

  for (const c of coverage) {
    if (c.days_covered < c.days_needed) {
      const zone = zones.find((z) => z.zone_id === c.zone_id);
      warnings.push({
        type: 'ZONE_UNCOVERED',
        message: `Zone "${zone?.zone_name}" still has unassigned orders. Consider adding vehicles or cover every 2 days.`,
        zone_id: c.zone_id,
      });
    }
    if (c.days_needed > 1) {
      const zone = zones.find((z) => z.zone_id === c.zone_id);
      warnings.push({
        type: 'ZONE_MULTI_DAY',
        message: `Zone "${zone?.zone_name}" requires multiple vehicle-trips (high order volume).`,
        zone_id: c.zone_id,
      });
    }
  }

  // Check overall capacity
  const totalCapacityAvailable = pool.reduce((sum, v) => sum + v.capacity, 0);
  const totalOrdersNeeded = zoneLoads.reduce((sum, z) => sum + z.order_count, 0);

  if (totalOrdersNeeded > totalCapacityAvailable) {
    warnings.push({
      type: 'ZONE_UNCOVERED',
      message: `Need capacity for ${totalOrdersNeeded} orders but only ${totalCapacityAvailable} available across all vehicles. Consider adding vehicles.`,
    });
  }

  return { slots, warnings, coverage };
}

/**
 * Re-balance schedule after a manual override.
 * Swaps zone assignments while keeping manual overrides fixed.
 */
export function rebalanceAfterOverride(
  slots: WeeklySlot[],
  changedSlotId: string,
  newZoneId: string | null
): WeeklySlot[] {
  const updatedSlots = slots.map((s) =>
    s.slot_id === changedSlotId
      ? { ...s, zone_id: newZoneId, is_manual_override: true }
      : s
  );
  return updatedSlots;
}

/** Get week start (Monday) from any date */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

/** Map ISO weekday to Day abbreviation */
export function isoDateToDay(dateStr: string): Day {
  const d = new Date(dateStr);
  return ALL_DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1];
}
