import React, { useState } from 'react';
import { Plus, Edit3, Trash2, X, Truck, CheckSquare } from 'lucide-react';
import type { Vehicle, Day } from '../types';
import { db } from '../db';

interface VehiclesProps {
  vehicles: Vehicle[];
  setVehicles: (v: Vehicle[]) => void;
}

const ALL_DAYS: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const EMPTY_VEHICLE: Omit<Vehicle, 'vehicle_id'> = {
  vehicle_name: '',
  capacity: 25,
  weight_capacity: 100,
  driver_name: '',
  availability: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

export default function Vehicles({ vehicles, setVehicles }: VehiclesProps) {
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Vehicle, 'vehicle_id'>>(EMPTY_VEHICLE);

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_VEHICLE);
    setShowModal(true);
  };

  const openEdit = (v: Vehicle) => {
    setEditId(v.vehicle_id);
    setForm({
      vehicle_name: v.vehicle_name,
      capacity: v.capacity,
      weight_capacity: v.weight_capacity,
      driver_name: v.driver_name,
      availability: [...v.availability],
    });
    setShowModal(true);
  };

  const handleSave = () => {
    const vehicle: Vehicle = {
      vehicle_id: editId || `VEH-${Date.now()}`,
      ...form,
    };
    db.upsertVehicle(vehicle);
    const updated = editId
      ? vehicles.map((v) => (v.vehicle_id === editId ? vehicle : v))
      : [...vehicles, vehicle];
    setVehicles(updated);
    setShowModal(false);
    setForm(EMPTY_VEHICLE);
    setEditId(null);
  };

  const handleDelete = (id: string) => {
    db.deleteVehicle(id);
    setVehicles(vehicles.filter((v) => v.vehicle_id !== id));
  };

  const toggleDay = (day: Day) => {
    setForm((f) => ({
      ...f,
      availability: f.availability.includes(day)
        ? f.availability.filter((d) => d !== day)
        : [...f.availability, day],
    }));
  };

  // Quick add 8 default vehicles
  const addDefaults = () => {
    const names = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel'];
    const drivers = ['Ramesh K', 'Suresh P', 'Mahesh R', 'Dinesh S', 'Ganesh T', 'Lokesh M', 'Rajesh V', 'Nilesh D'];
    const defaults: Vehicle[] = names.map((name, i) => ({
      vehicle_id: `VEH-${Date.now()}-${i}`,
      vehicle_name: `Vehicle ${name}`,
      capacity: 25,
      weight_capacity: 100,
      driver_name: drivers[i],
      availability: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as Day[],
    }));
    db.saveVehicles(defaults);
    setVehicles(defaults);
  };

  const totalCapacity = vehicles.reduce((s, v) => s + v.capacity, 0);
  const totalDays = vehicles.reduce((s, v) => s + v.availability.length, 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem' }}>Vehicles</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Manage your delivery fleet — set capacity, driver names, and availability
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {vehicles.length === 0 && (
            <button className="btn btn-secondary" onClick={addDefaults}>
              <Truck size={14} /> Add 8 Default Vehicles
            </button>
          )}
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={14} /> Add Vehicle
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: '20px' }}>
        <div className="stat-card accent">
          <span className="stat-label">Total Vehicles</span>
          <div className="stat-value" style={{ color: '#818cf8' }}>{vehicles.length}</div>
        </div>
        <div className="stat-card success">
          <span className="stat-label">Total Capacity / Trip</span>
          <div className="stat-value" style={{ color: '#10b981' }}>{totalCapacity}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>orders across all vehicles</div>
        </div>
        <div className="stat-card warning">
          <span className="stat-label">Vehicle-Days / Week</span>
          <div className="stat-value" style={{ color: '#f59e0b' }}>{totalDays}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>total available delivery slots</div>
        </div>
      </div>

      {/* Vehicle table */}
      {vehicles.length > 0 ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Capacity (orders)</th>
                <th>Weight Cap (kg)</th>
                <th>Available Days</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.vehicle_id}>
                  <td style={{ fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Truck size={14} style={{ color: '#818cf8' }} />
                      {v.vehicle_name}
                    </div>
                  </td>
                  <td>{v.driver_name}</td>
                  <td className="font-mono">{v.capacity}</td>
                  <td className="font-mono">{v.weight_capacity}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '3px' }}>
                      {ALL_DAYS.map((d) => (
                        <span
                          key={d}
                          className={`badge ${v.availability.includes(d) ? 'badge-delivered' : 'badge-failed'}`}
                          style={{ fontSize: '0.6rem', padding: '1px 5px' }}
                        >
                          {d.charAt(0)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-sm btn-secondary" style={{ padding: '3px 7px' }}
                        onClick={() => openEdit(v)}>
                        <Edit3 size={12} />
                      </button>
                      <button className="btn btn-sm btn-danger" style={{ padding: '3px 7px' }}
                        onClick={() => handleDelete(v.vehicle_id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <Truck size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>No vehicles added</div>
          <div style={{ fontSize: '0.78rem', marginTop: '6px' }}>
            Add vehicles manually or click "Add 8 Default Vehicles" to get started quickly
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <h3>{editId ? 'Edit Vehicle' : 'Add New Vehicle'}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowModal(false)}>
                <X size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Vehicle Name</label>
                <input className="form-input" value={form.vehicle_name}
                  placeholder="e.g., Vehicle Alpha"
                  onChange={(e) => setForm({ ...form, vehicle_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Driver Name</label>
                <input className="form-input" value={form.driver_name}
                  placeholder="e.g., Ramesh Kumar"
                  onChange={(e) => setForm({ ...form, driver_name: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Order Capacity / Trip</label>
                  <input className="form-input" type="number" value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Weight Capacity (kg)</label>
                  <input className="form-input" type="number" value={form.weight_capacity}
                    onChange={(e) => setForm({ ...form, weight_capacity: parseInt(e.target.value) || 1 })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Available Days</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {ALL_DAYS.map((d) => (
                    <button
                      key={d}
                      className={`chip ${form.availability.includes(d) ? 'selected' : ''}`}
                      onClick={() => toggleDay(d)}
                      style={{
                        background: form.availability.includes(d) ? 'rgba(16,185,129,0.2)' : undefined,
                        borderColor: form.availability.includes(d) ? '#10b981' : undefined,
                        color: form.availability.includes(d) ? '#10b981' : undefined,
                        cursor: 'pointer',
                      }}
                    >
                      {form.availability.includes(d) && <CheckSquare size={11} />}
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave}
                  disabled={!form.vehicle_name}>
                  {editId ? 'Save Changes' : 'Add Vehicle'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
