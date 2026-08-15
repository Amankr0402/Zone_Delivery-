// ─── Core Data Models ────────────────────────────────────────────────────────

export type OrderStatus = 'Pending' | 'Allocated' | 'In Transit' | 'Delivered' | 'Failed';
export type Priority = 'Low' | 'Normal' | 'High' | 'Urgent';
export type Day = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface Order {
  order_id: string;
  customer_name: string;
  pincode: string;
  area_name: string;
  address: string;
  order_date: string;        // ISO date string
  status: OrderStatus;
  priority: Priority;
  weight: number;            // kg
  lat?: number;
  lng?: number;
  zone_id?: string;          // assigned after clustering
}

export interface PincodeRecord {
  pincode: string;
  area_name: string;
  lat: number;
  lng: number;
}

export interface Zone {
  zone_id: string;
  zone_name: string;
  pincodes: string[];        // pincode strings
  centroid_lat: number;
  centroid_lng: number;
  color: string;             // hex color for map/UI
  order_count?: number;      // computed
}

export interface Vehicle {
  vehicle_id: string;
  vehicle_name: string;
  capacity: number;          // max orders per trip
  weight_capacity: number;   // max kg per trip
  driver_name: string;
  availability: Day[];       // days it can run
}

export interface Assignment {
  assignment_id: string;
  date: string;              // ISO date
  vehicle_id: string;
  zone_id: string;
  order_ids: string[];
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  notes?: string;
}

export interface WeeklySlot {
  slot_id: string;
  week_start: string;        // ISO date of Monday
  vehicle_id: string;
  day: Day;
  zone_id: string | null;    // null = idle
  is_manual_override: boolean;
  notes?: string;
}

// ─── Algorithm / UI helpers ──────────────────────────────────────────────────

export interface ClusterPoint {
  pincode: string;
  area_name: string;
  lat: number;
  lng: number;
  order_count: number;
  zone_id: string;
}

export interface ScheduleWarning {
  type: 'ZONE_UNCOVERED' | 'VEHICLE_OVERLOADED' | 'ZONE_MULTI_DAY';
  message: string;
  zone_id?: string;
  vehicle_id?: string;
}

export interface ScheduleResult {
  slots: WeeklySlot[];
  warnings: ScheduleWarning[];
  coverage: { zone_id: string; days_covered: number; days_needed: number }[];
}

export interface DashboardStats {
  total_orders_today: number;
  total_zones: number;
  vehicles_in_use: number;
  vehicles_idle: number;
  unallocated_orders: number;
  total_orders: number;
}

// ─── CSV import helpers ───────────────────────────────────────────────────────

export interface RawOrderRow {
  [key: string]: string;
}

export interface RawPincodeRow {
  [key: string]: string;
}
