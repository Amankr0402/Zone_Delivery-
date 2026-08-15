import React, { useState, useMemo } from 'react';
import {
  CalendarDays, Zap, Download, AlertTriangle, RefreshCw, Info
} from 'lucide-react';
import type { Zone, Vehicle, WeeklySlot, ScheduleWarning, Order } from '../types';
import { db } from '../db';
import { generateSchedule, getWeekStart, rebalanceAfterOverride } from '../utils/scheduling';
import { exportSchedule } from '../utils/export';
import WeeklyMatrix from '../components/WeeklyMatrix';

interface ScheduleProps {
  orders: Order[];
  zones: Zone[];
  vehicles: Vehicle[];
  slots: WeeklySlot[];
  setSlots: (s: WeeklySlot[]) => void;
}

export default function Schedule({ orders, zones, vehicles, slots, setSlots }: ScheduleProps) {
  const [warnings, setWarnings] = useState<ScheduleWarning[]>([]);
  const [coverage, setCoverage] = useState<{ zone_id: string; days_covered: number; days_needed: number }[]>([]);
  const [weekStart, setWeekStart] = useState(getWeekStart());

  // ─── Order count by zone ────────────────────────────────────────────────────
  const orderCountByZone = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const z of zones) {
      counts[z.zone_id] = orders.filter((o) => z.pincodes.includes(o.pincode)).length;
    }
    return counts;
  }, [orders, zones]);

  // ─── Generate Schedule ──────────────────────────────────────────────────────
  const handleGenerate = () => {
    const result = generateSchedule(zones, vehicles, weekStart, orderCountByZone);
    db.saveWeeklySlots(result.slots);
    setSlots(result.slots);
    setWarnings(result.warnings);
    setCoverage(result.coverage);
  };

  // ─── Manual Override ───────────────────────────────────────────────────────
  const handleOverride = (slotId: string, newZoneId: string | null) => {
    const updated = rebalanceAfterOverride(slots, slotId, newZoneId);
    db.saveWeeklySlots(updated);
    setSlots(updated);
  };

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const totalSlots = slots.length;
  const assignedSlots = slots.filter((s) => s.zone_id).length;
  const idleSlots = totalSlots - assignedSlots;
  const overrides = slots.filter((s) => s.is_manual_override).length;

  const canGenerate = zones.length > 0 && vehicles.length > 0;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem' }}>Weekly Schedule</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Generate and manage vehicle-zone assignments for the week
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {slots.length > 0 && (
            <button className="btn btn-secondary" onClick={() => exportSchedule(slots, vehicles, zones, weekStart)}>
              <Download size={14} /> Export Excel
            </button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ width: '180px' }}>
            <label className="form-label">Week Starting</label>
            <input className="form-input" type="date" value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-lg" onClick={handleGenerate} disabled={!canGenerate}>
            <Zap size={16} /> Generate Schedule
          </button>
          {slots.length > 0 && (
            <button className="btn btn-secondary" onClick={handleGenerate}>
              <RefreshCw size={14} /> Regenerate
            </button>
          )}
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {zones.length} zones · {vehicles.length} vehicles · {orders.length} orders
          </div>
        </div>
      </div>

      {!canGenerate && (
        <div className="alert alert-warning" style={{ marginBottom: '16px' }}>
          <Info size={16} />
          <span>
            You need at least <strong>1 zone</strong> and <strong>1 vehicle</strong> to generate a schedule.
            {zones.length === 0 && ' Go to Zones page to create zones.'}
            {vehicles.length === 0 && ' Go to Vehicles page to add vehicles.'}
          </span>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {warnings.map((w, i) => (
            <div key={i} className={`alert ${w.type === 'ZONE_UNCOVERED' ? 'alert-danger' : 'alert-warning'}`}>
              <AlertTriangle size={14} />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats row */}
      {slots.length > 0 && (
        <div className="grid-4" style={{ marginBottom: '20px' }}>
          <div className="stat-card accent">
            <span className="stat-label">Total Slots</span>
            <div className="stat-value" style={{ color: '#818cf8', fontSize: '1.6rem' }}>{totalSlots}</div>
          </div>
          <div className="stat-card success">
            <span className="stat-label">Assigned</span>
            <div className="stat-value" style={{ color: '#10b981', fontSize: '1.6rem' }}>{assignedSlots}</div>
          </div>
          <div className="stat-card warning">
            <span className="stat-label">Idle Slots</span>
            <div className="stat-value" style={{ color: '#f59e0b', fontSize: '1.6rem' }}>{idleSlots}</div>
          </div>
          <div className="stat-card danger">
            <span className="stat-label">Manual Overrides</span>
            <div className="stat-value" style={{ color: '#f43f5e', fontSize: '1.6rem' }}>{overrides}</div>
          </div>
        </div>
      )}

      {/* Weekly Matrix */}
      {slots.length > 0 ? (
        <div>
          <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>
              <CalendarDays size={16} style={{ verticalAlign: 'text-bottom', marginRight: '6px' }} />
              Week of {weekStart}
            </h3>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Click any cell to manually override · Yellow border = manual override
            </div>
          </div>
          <WeeklyMatrix
            slots={slots}
            vehicles={vehicles}
            zones={zones}
            onOverride={handleOverride}
          />
        </div>
      ) : canGenerate ? (
        <div className="card" style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
          <CalendarDays size={36} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            No schedule generated yet
          </div>
          <div style={{ fontSize: '0.82rem', marginTop: '8px' }}>
            Click "Generate Schedule" to create the weekly vehicle-zone assignment matrix
          </div>
        </div>
      ) : null}

      {/* Coverage table */}
      {coverage.length > 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <h3 style={{ marginBottom: '12px' }}>Zone Coverage Analysis</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>Orders</th>
                  <th>Trips Needed</th>
                  <th>Trips Covered</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {coverage.map((c) => {
                  const zone = zones.find((z) => z.zone_id === c.zone_id);
                  const ok = c.days_covered >= c.days_needed;
                  return (
                    <tr key={c.zone_id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="zone-dot" style={{ background: zone?.color }} />
                          <span style={{ fontWeight: 600 }}>{zone?.zone_name}</span>
                        </div>
                      </td>
                      <td className="font-mono">{orderCountByZone[c.zone_id] ?? 0}</td>
                      <td className="font-mono">{c.days_needed}</td>
                      <td className="font-mono">{c.days_covered}</td>
                      <td>
                        <span className={`badge ${ok ? 'badge-delivered' : 'badge-failed'}`}>
                          {ok ? '✓ Covered' : `⚠ Needs ${c.days_needed - c.days_covered} more`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
