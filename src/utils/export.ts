/**
 * utils/export.ts
 * CSV and Excel export for orders, zones, and schedule
 */

import * as XLSX from 'xlsx';
import type { Order, Zone, Vehicle, WeeklySlot } from '../types';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

// ─── Generic CSV download ─────────────────────────────────────────────────────
export function downloadCSV(filename: string, rows: Record<string, unknown>[]): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(','),
    ...rows.map((r) =>
      headers.map((h) => {
        const val = String(r[h] ?? '');
        return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(',')
    ),
  ];
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

// ─── Excel download (multi-sheet) ─────────────────────────────────────────────
export function downloadExcel(
  filename: string,
  sheets: { name: string; rows: Record<string, unknown>[] }[]
): void {
  const wb = XLSX.utils.book_new();
  for (const { name, rows } of sheets) {
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  XLSX.writeFile(wb, filename);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Orders export ─────────────────────────────────────────────────────────────
export function exportOrders(orders: Order[], zones: Zone[]): void {
  const zoneMap = new Map(zones.map((z) => [z.zone_id, z.zone_name]));
  const rows = orders.map((o) => ({
    Order_ID: o.order_id,
    Customer: o.customer_name,
    Pincode: o.pincode,
    Area: o.area_name,
    Address: o.address,
    Date: o.order_date,
    Status: o.status,
    Priority: o.priority,
    Weight_kg: o.weight,
    Zone: o.zone_id ? (zoneMap.get(o.zone_id) ?? o.zone_id) : 'Unassigned',
    Lat: o.lat ?? '',
    Lng: o.lng ?? '',
  }));
  downloadCSV('orders_export.csv', rows);
}

// ─── Schedule export ───────────────────────────────────────────────────────────
export function exportSchedule(
  slots: WeeklySlot[],
  vehicles: Vehicle[],
  zones: Zone[],
  weekStart: string
): void {
  const vehicleMap = new Map(vehicles.map((v) => [v.vehicle_id, v]));
  const zoneMap = new Map(zones.map((z) => [z.zone_id, z.zone_name]));

  // Flat rows for CSV
  const csvRows = slots.map((s) => ({
    Week_Start: s.week_start,
    Day: s.day,
    Vehicle: vehicleMap.get(s.vehicle_id)?.vehicle_name ?? s.vehicle_id,
    Driver: vehicleMap.get(s.vehicle_id)?.driver_name ?? '',
    Zone: s.zone_id ? (zoneMap.get(s.zone_id) ?? s.zone_id) : 'Idle',
    Override: s.is_manual_override ? 'Yes' : 'No',
    Notes: s.notes ?? '',
  }));

  // Matrix sheet: rows=vehicles, cols=days
  const matrixRows = vehicles.map((v) => {
    const row: Record<string, string> = {
      Vehicle: v.vehicle_name,
      Driver: v.driver_name,
    };
    for (const day of ALL_DAYS) {
      const slot = slots.find((s) => s.vehicle_id === v.vehicle_id && s.day === day);
      row[day] = slot?.zone_id ? (zoneMap.get(slot.zone_id) ?? slot.zone_id) : slot ? 'Idle' : 'N/A';
    }
    return row;
  });

  downloadExcel(`schedule_${weekStart}.xlsx`, [
    { name: 'Weekly Matrix', rows: matrixRows },
    { name: 'Full Schedule', rows: csvRows },
  ]);
}
