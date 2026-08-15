import React, { useState, useCallback } from 'react';
import {
  Zap, Edit3, RefreshCw, Layers, MoveRight, Trash2, Plus, X
} from 'lucide-react';
import type { Order, Zone, PincodeRecord } from '../types';
import { db } from '../db';
import { kMeansCluster, buildZones, buildClusterInputs } from '../utils/clustering';
import ZoneMap from '../components/ZoneMap';

interface ZonesProps {
  orders: Order[];
  setOrders: (o: Order[]) => void;
  zones: Zone[];
  setZones: (z: Zone[]) => void;
  pincodes: PincodeRecord[];
}

export default function Zones({ orders, setOrders, zones, setZones, pincodes }: ZonesProps) {
  const [numZones, setNumZones] = useState(6);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [movePincodeModal, setMovePincodeModal] = useState<{ pincode: string; fromZone: string } | null>(null);

  // ─── Auto-cluster ──────────────────────────────────────────────────────────
  const handleAutoCluster = useCallback(() => {
    const pincodeMap = new Map(pincodes.map((p) => [p.pincode, p]));
    const inputs = buildClusterInputs(orders, pincodeMap);

    if (inputs.length === 0) return;

    const result = kMeansCluster(inputs, numZones);
    const newZones = buildZones(result, pincodeMap);

    // Assign zone_id to orders
    const pinToZone = new Map<string, string>();
    for (const z of newZones) {
      for (const pin of z.pincodes) {
        pinToZone.set(pin, z.zone_id);
      }
    }
    const updatedOrders = orders.map((o) => ({ ...o, zone_id: pinToZone.get(o.pincode) || o.zone_id }));

    db.saveZones(newZones);
    db.saveOrders(updatedOrders);
    setZones(newZones);
    setOrders(updatedOrders);
    setSelectedZone(null);
  }, [orders, pincodes, numZones, setZones, setOrders]);

  // ─── Rename zone ───────────────────────────────────────────────────────────
  const handleRename = (zoneId: string) => {
    if (!editName.trim()) return;
    const updated = zones.map((z) =>
      z.zone_id === zoneId ? { ...z, zone_name: editName.trim() } : z
    );
    db.saveZones(updated);
    setZones(updated);
    setEditingZone(null);
    setEditName('');
  };

  // ─── Delete zone ──────────────────────────────────────────────────────────
  const handleDeleteZone = (zoneId: string) => {
    const updated = zones.filter((z) => z.zone_id !== zoneId);
    const updatedOrders = orders.map((o) =>
      o.zone_id === zoneId ? { ...o, zone_id: undefined } : o
    );
    db.saveZones(updated);
    db.saveOrders(updatedOrders);
    setZones(updated);
    setOrders(updatedOrders);
    if (selectedZone === zoneId) setSelectedZone(null);
  };

  // ─── Move pincode between zones ────────────────────────────────────────────
  const handleMovePincode = (pincode: string, fromZone: string, toZone: string) => {
    const updated = zones.map((z) => {
      if (z.zone_id === fromZone) return { ...z, pincodes: z.pincodes.filter((p) => p !== pincode) };
      if (z.zone_id === toZone) return { ...z, pincodes: [...z.pincodes, pincode] };
      return z;
    });
    // Recalculate centroids
    const pincodeMap = new Map(pincodes.map((p) => [p.pincode, p]));
    const recalculated = updated.map((z) => {
      const coords = z.pincodes.map((pin) => pincodeMap.get(pin)).filter(Boolean) as PincodeRecord[];
      if (coords.length === 0) return z;
      return {
        ...z,
        centroid_lat: coords.reduce((s, c) => s + c.lat, 0) / coords.length,
        centroid_lng: coords.reduce((s, c) => s + c.lng, 0) / coords.length,
        order_count: orders.filter((o) => z.pincodes.includes(o.pincode)).length,
      };
    }).filter((z) => z.pincodes.length > 0);

    // Update order zone assignments
    const pinToZone = new Map<string, string>();
    for (const z of recalculated) {
      for (const pin of z.pincodes) pinToZone.set(pin, z.zone_id);
    }
    const updatedOrders = orders.map((o) => ({ ...o, zone_id: pinToZone.get(o.pincode) || o.zone_id }));

    db.saveZones(recalculated);
    db.saveOrders(updatedOrders);
    setZones(recalculated);
    setOrders(updatedOrders);
    setMovePincodeModal(null);
  };

  const selectedZoneData = zones.find((z) => z.zone_id === selectedZone);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem' }}>Zone Clustering</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Auto-cluster pincodes into delivery zones or manually manage zone assignments
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ width: '180px' }}>
            <label className="form-label">Number of Zones</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="range"
                min={2}
                max={Math.max(2, Math.min(20, new Set(orders.map((o) => o.pincode)).size))}
                value={numZones}
                onChange={(e) => setNumZones(parseInt(e.target.value))}
                style={{ flex: 1 }}
              />
              <span className="font-mono" style={{ fontWeight: 700, color: 'var(--accent)' }}>{numZones}</span>
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleAutoCluster}
            disabled={orders.length === 0}>
            <Zap size={14} /> Auto-Cluster
          </button>
          {zones.length > 0 && (
            <button className="btn btn-secondary" onClick={handleAutoCluster}>
              <RefreshCw size={14} /> Re-Cluster
            </button>
          )}
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <Layers size={14} style={{ verticalAlign: 'text-bottom', marginRight: '4px' }} />
            {zones.length} zones · {orders.length} orders · {new Set(orders.map((o) => o.pincode)).size} pincodes
          </div>
        </div>
      </div>

      {orders.length === 0 && (
        <div className="alert alert-warning" style={{ marginBottom: '16px' }}>
          <Zap size={16} />
          Upload orders first (Orders page) before clustering. The algorithm needs order data with pincodes to create zones.
        </div>
      )}

      {/* Map + Zone Cards layout */}
      <div style={{ display: 'grid', gridTemplateColumns: zones.length > 0 ? '1fr 360px' : '1fr', gap: '20px' }}>
        {/* Map */}
        <div>
          <ZoneMap
            zones={zones}
            orders={orders}
            pincodes={pincodes}
            height={500}
            selectedZone={selectedZone}
            onZoneClick={(id) => setSelectedZone(selectedZone === id ? null : id)}
          />
        </div>

        {/* Zone cards sidebar */}
        {zones.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
            {zones.map((z) => {
              const orderCount = orders.filter((o) => z.pincodes.includes(o.pincode)).length;
              const isSelected = selectedZone === z.zone_id;
              return (
                <div
                  key={z.zone_id}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    borderColor: isSelected ? z.color : 'var(--border)',
                    borderWidth: isSelected ? '2px' : '1px',
                    background: isSelected ? `${z.color}10` : 'var(--bg-card)',
                  }}
                  onClick={() => setSelectedZone(isSelected ? null : z.zone_id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="zone-dot" style={{ background: z.color }} />
                      {editingZone === z.zone_id ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <input className="form-input" style={{ width: '100px', padding: '3px 8px', fontSize: '0.78rem' }}
                            value={editName} onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRename(z.zone_id)} autoFocus />
                          <button className="btn btn-sm btn-success" style={{ padding: '2px 6px' }}
                            onClick={() => handleRename(z.zone_id)}>✓</button>
                        </div>
                      ) : (
                        <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{z.zone_name}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-sm btn-secondary" style={{ padding: '2px 6px' }}
                        onClick={(e) => { e.stopPropagation(); setEditingZone(z.zone_id); setEditName(z.zone_name); }}>
                        <Edit3 size={11} />
                      </button>
                      <button className="btn btn-sm btn-danger" style={{ padding: '2px 6px' }}
                        onClick={(e) => { e.stopPropagation(); handleDeleteZone(z.zone_id); }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '12px' }}>
                    <span>📦 {orderCount} orders</span>
                    <span>📍 {z.pincodes.length} pincodes</span>
                  </div>
                  {isSelected && (
                    <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {z.pincodes.map((pin) => {
                        const rec = pincodes.find((p) => p.pincode === pin);
                        return (
                          <span key={pin} className="chip" title={`${pin} — ${rec?.area_name || ''}`}>
                            {pin}
                            <MoveRight
                              size={10}
                              className="chip-close"
                              title="Move to another zone"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMovePincodeModal({ pincode: pin, fromZone: z.zone_id });
                              }}
                            />
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Zone summary table */}
      {zones.length > 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <h3 style={{ marginBottom: '12px' }}>Zone Summary</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>Pincodes</th>
                  <th>Orders</th>
                  <th>Centroid</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((z) => {
                  const orderCount = orders.filter((o) => z.pincodes.includes(o.pincode)).length;
                  return (
                    <tr key={z.zone_id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="zone-dot" style={{ background: z.color }} />
                          <span style={{ fontWeight: 600 }}>{z.zone_name}</span>
                        </div>
                      </td>
                      <td>{z.pincodes.length}</td>
                      <td style={{ fontWeight: 600 }}>{orderCount}</td>
                      <td className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        {z.centroid_lat.toFixed(4)}, {z.centroid_lng.toFixed(4)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Move Pincode Modal */}
      {movePincodeModal && (
        <div className="modal-backdrop" onClick={() => setMovePincodeModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '16px' }}>Move Pincode {movePincodeModal.pincode}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Select the destination zone:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {zones.filter((z) => z.zone_id !== movePincodeModal.fromZone).map((z) => (
                <button
                  key={z.zone_id}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() => handleMovePincode(movePincodeModal.pincode, movePincodeModal.fromZone, z.zone_id)}
                >
                  <span className="zone-dot" style={{ background: z.color }} />
                  {z.zone_name} ({z.pincodes.length} pincodes)
                </button>
              ))}
            </div>
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setMovePincodeModal(null)}>
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
