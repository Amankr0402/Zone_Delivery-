import React, { useMemo, useState } from 'react';
import {
  Package, Map, Truck, TruckIcon, AlertCircle, CalendarDays, ChevronDown
} from 'lucide-react';
import type { Order, Zone, Vehicle, WeeklySlot, PincodeRecord, Day } from '../types';
import StatCard from '../components/StatCard';
import ZoneMap from '../components/ZoneMap';

interface DashboardProps {
  orders: Order[];
  zones: Zone[];
  vehicles: Vehicle[];
  slots: WeeklySlot[];
  pincodes: PincodeRecord[];
}

const ALL_DAYS: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Dashboard({ orders, zones, vehicles, slots, pincodes }: DashboardProps) {
  const today = new Date().toISOString().split('T')[0];
  const todayDay = ALL_DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const [selectedDay, setSelectedDay] = useState<Day>(todayDay);

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const todayOrders = orders.filter((o) => o.order_date === today);
    const assignedPincodes = new Set(zones.flatMap((z) => z.pincodes));
    const unallocated = orders.filter((o) => !assignedPincodes.has(o.pincode));

    const daySlots = slots.filter((s) => s.day === selectedDay);
    const vehiclesInUse = new Set(daySlots.filter((s) => s.zone_id).map((s) => s.vehicle_id)).size;
    const vehiclesIdle = vehicles.length - vehiclesInUse;

    return {
      total_orders_today: todayOrders.length,
      total_zones: zones.length,
      vehicles_in_use: vehiclesInUse,
      vehicles_idle: vehiclesIdle,
      unallocated_orders: unallocated.length,
      total_orders: orders.length,
    };
  }, [orders, zones, vehicles, slots, today, selectedDay]);

  // ─── Day's schedule ─────────────────────────────────────────────────────────
  const daySchedule = useMemo(() => {
    return slots.filter((s) => s.day === selectedDay).map((s) => {
      const vehicle = vehicles.find((v) => v.vehicle_id === s.vehicle_id);
      const zone = zones.find((z) => z.zone_id === s.zone_id);
      return { slot: s, vehicle, zone };
    });
  }, [slots, selectedDay, vehicles, zones]);

  // ─── Zone order distribution for chart ──────────────────────────────────────
  const zoneData = useMemo(() => {
    return zones.map((z) => ({
      name: z.zone_name,
      orders: orders.filter((o) => z.pincodes.includes(o.pincode)).length,
      color: z.color,
    })).sort((a, b) => b.orders - a.orders);
  }, [zones, orders]);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.4rem' }}>Dashboard</h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Overview of your delivery operations — {today}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        <StatCard
          label="Total Orders"
          value={stats.total_orders}
          icon={<Package size={20} />}
          variant="accent"
          subtitle={`${stats.total_orders_today} today`}
        />
        <StatCard
          label="Delivery Zones"
          value={stats.total_zones}
          icon={<Map size={20} />}
          variant="success"
          subtitle={`${new Set(orders.map((o) => o.pincode)).size} unique pincodes`}
        />
        <StatCard
          label={`Vehicles Active (${selectedDay})`}
          value={stats.vehicles_in_use}
          icon={<Truck size={20} />}
          variant="warning"
          subtitle={`${stats.vehicles_idle} idle`}
        />
        <StatCard
          label="Unallocated"
          value={stats.unallocated_orders}
          icon={<AlertCircle size={20} />}
          variant={stats.unallocated_orders > 0 ? 'danger' : 'success'}
          subtitle={stats.unallocated_orders > 0 ? 'orders need zone assignment' : 'all orders assigned'}
        />
      </div>

      {/* Main grid: Map + Schedule */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', marginBottom: '24px' }}>
        {/* Map */}
        <div>
          <div className="card-header" style={{ marginBottom: '12px' }}>
            <h3>
              <Map size={16} style={{ verticalAlign: 'text-bottom', marginRight: '6px' }} />
              Zone Map
            </h3>
          </div>
          <ZoneMap
            zones={zones}
            orders={orders}
            pincodes={pincodes}
            height={420}
            showOrders={true}
          />
        </div>

        {/* Day Schedule sidebar */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <CalendarDays size={16} style={{ color: '#818cf8' }} />
            <h3 style={{ flex: 1 }}>Day Schedule</h3>
            <div style={{ position: 'relative' }}>
              <select
                className="form-select"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value as Day)}
                style={{ width: '100px', padding: '5px 10px', fontSize: '0.78rem' }}
              >
                {ALL_DAYS.map((d) => (
                  <option key={d} value={d}>{d}{d === todayDay ? ' (Today)' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
            {daySchedule.length > 0 ? (
              daySchedule.map(({ slot, vehicle, zone }) => (
                <div
                  key={slot.slot_id}
                  className="card"
                  style={{
                    padding: '14px',
                    borderLeft: `3px solid ${zone?.color ?? 'var(--text-muted)'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                        {vehicle?.vehicle_name ?? 'Unknown'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        {vehicle?.driver_name}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {zone ? (
                        <span
                          className="badge"
                          style={{
                            background: `${zone.color}22`,
                            color: zone.color,
                            border: `1px solid ${zone.color}44`,
                          }}
                        >
                          {zone.zone_name}
                        </span>
                      ) : (
                        <span className="badge badge-pending">Idle</span>
                      )}
                      {slot.is_manual_override && (
                        <div style={{ fontSize: '0.62rem', color: '#f59e0b', marginTop: '4px' }}>
                          Manual Override
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                <CalendarDays size={24} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                <div style={{ fontSize: '0.8rem' }}>
                  No schedule for {selectedDay}
                </div>
                <div style={{ fontSize: '0.72rem', marginTop: '4px' }}>
                  Generate a schedule from the Schedule page
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Zone Order Distribution */}
      {zoneData.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Orders by Zone</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {zoneData.map((z) => {
              const maxOrders = Math.max(...zoneData.map((d) => d.orders), 1);
              const pct = (z.orders / maxOrders) * 100;
              return (
                <div key={z.name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '80px', fontSize: '0.78rem', fontWeight: 600, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="zone-dot" style={{ background: z.color }} />
                    {z.name}
                  </div>
                  <div style={{ flex: 1, height: '24px', background: 'var(--bg-surface)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${z.color}, ${z.color}88)`,
                        borderRadius: '6px',
                        transition: 'width 0.5s ease',
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: '8px',
                      }}
                    >
                      {pct > 15 && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'white' }}>{z.orders}</span>
                      )}
                    </div>
                  </div>
                  {pct <= 15 && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', width: '30px' }}>
                      {z.orders}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
