import React, { useState } from 'react';
import type { WeeklySlot, Vehicle, Zone, Day } from '../types';
import { Pencil, X, Check } from 'lucide-react';

interface WeeklyMatrixProps {
  slots: WeeklySlot[];
  vehicles: Vehicle[];
  zones: Zone[];
  onOverride?: (slotId: string, newZoneId: string | null) => void;
}

const ALL_DAYS: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WeeklyMatrix({ slots, vehicles, zones, onOverride }: WeeklyMatrixProps) {
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [editZoneId, setEditZoneId] = useState<string | null>(null);

  const zoneMap = new Map(zones.map((z) => [z.zone_id, z]));

  const getSlot = (vehicleId: string, day: Day): WeeklySlot | undefined =>
    slots.find((s) => s.vehicle_id === vehicleId && s.day === day);

  const handleSaveOverride = () => {
    if (editingSlot && onOverride) {
      onOverride(editingSlot, editZoneId);
    }
    setEditingSlot(null);
    setEditZoneId(null);
  };

  return (
    <div className="schedule-matrix">
      <table className="matrix-table">
        <thead>
          <tr>
            <th style={{ textAlign: 'left', minWidth: '120px' }}>Vehicle</th>
            {ALL_DAYS.map((d) => (
              <th key={d}>{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => (
            <tr key={v.vehicle_id}>
              <td style={{ textAlign: 'left', fontWeight: 600, fontSize: '0.78rem' }}>
                <div>{v.vehicle_name}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                  {v.driver_name}
                </div>
              </td>
              {ALL_DAYS.map((day) => {
                const slot = getSlot(v.vehicle_id, day);
                const isAvailable = v.availability.includes(day);
                const zone = slot?.zone_id ? zoneMap.get(slot.zone_id) : null;
                const isEditing = editingSlot === slot?.slot_id;

                if (!isAvailable) {
                  return (
                    <td key={day}>
                      <span
                        className="matrix-cell"
                        style={{
                          background: 'rgba(40,40,60,0.3)',
                          color: 'var(--text-muted)',
                          cursor: 'default',
                          fontSize: '0.68rem',
                        }}
                      >
                        N/A
                      </span>
                    </td>
                  );
                }

                if (isEditing) {
                  return (
                    <td key={day}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
                        <select
                          className="form-select"
                          style={{ width: '80px', padding: '4px 6px', fontSize: '0.7rem' }}
                          value={editZoneId ?? ''}
                          onChange={(e) => setEditZoneId(e.target.value || null)}
                        >
                          <option value="">Idle</option>
                          {zones.map((z) => (
                            <option key={z.zone_id} value={z.zone_id}>
                              {z.zone_name}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn btn-sm btn-success"
                          style={{ padding: '3px 6px' }}
                          onClick={handleSaveOverride}
                        >
                          <Check size={12} />
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          style={{ padding: '3px 6px' }}
                          onClick={() => { setEditingSlot(null); setEditZoneId(null); }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </td>
                  );
                }

                return (
                  <td key={day}>
                    <span
                      className={`matrix-cell ${zone ? 'assigned' : 'idle'}${slot?.is_manual_override ? ' override' : ''}`}
                      style={zone ? { background: zone.color } : undefined}
                      onClick={() => {
                        if (slot) {
                          setEditingSlot(slot.slot_id);
                          setEditZoneId(slot.zone_id);
                        }
                      }}
                      title={
                        slot?.is_manual_override
                          ? 'Manual override — click to change'
                          : 'Click to override'
                      }
                    >
                      {zone ? zone.zone_name : 'Idle'}
                      {onOverride && (
                        <Pencil
                          size={10}
                          style={{ marginLeft: 4, opacity: 0.5, verticalAlign: 'text-top' }}
                        />
                      )}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
