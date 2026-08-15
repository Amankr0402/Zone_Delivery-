import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Upload, FileSpreadsheet, Trash2, Search, Filter,
  Download, Plus, AlertTriangle, CheckCircle2, X, MapPin
} from 'lucide-react';
import type { Order, PincodeRecord } from '../types';
import { db } from '../db';
import { parseCSV, mapRowToOrder, mapRowToPincode, BUILTIN_PINCODES, enrichOrdersWithCoords } from '../utils/geocoding';
import { exportOrders } from '../utils/export';

interface OrdersProps {
  orders: Order[];
  setOrders: (o: Order[]) => void;
  pincodes: PincodeRecord[];
  setPincodes: (p: PincodeRecord[]) => void;
  zones: import('../types').Zone[];
}

export default function Orders({ orders, setOrders, pincodes, setPincodes, zones }: OrdersProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dragOver, setDragOver] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [geocodeProgress, setGeocodeProgress] = useState<{ done: number; total: number } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const orderInputRef = useRef<HTMLInputElement>(null);
  const pincodeInputRef = useRef<HTMLInputElement>(null);

  // ─── Load built-in pincodes on mount ────────────────────────────────────────
  useEffect(() => {
    if (pincodes.length === 0) {
      const saved = db.getPincodes();
      if (saved.length === 0) {
        db.savePincodes(BUILTIN_PINCODES);
        setPincodes(BUILTIN_PINCODES);
      } else {
        setPincodes(saved);
      }
    }
  }, []);

  // ─── CSV Upload handlers ────────────────────────────────────────────────────
  const handleOrderCSV = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        setUploadMsg({ type: 'error', text: 'No valid rows found in CSV' });
        return;
      }
      let parsed = rows.map((r, i) => mapRowToOrder(r, i));

      // Enrich with coordinates
      const pincodeMap = new Map(pincodes.map((p) => [p.pincode, p]));
      setGeocodeProgress({ done: 0, total: parsed.length });
      parsed = await enrichOrdersWithCoords(parsed, pincodeMap, (done, total) =>
        setGeocodeProgress({ done, total })
      );
      setGeocodeProgress(null);

      const merged = db.addOrders(parsed);
      setOrders(merged);
      setUploadMsg({ type: 'success', text: `Imported ${parsed.length} orders from ${file.name}` });
    } catch {
      setUploadMsg({ type: 'error', text: 'Failed to parse CSV file' });
    }
  }, [pincodes, setOrders]);

  const handlePincodeCSV = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const parsed = rows.map(mapRowToPincode).filter(Boolean) as PincodeRecord[];
      if (parsed.length === 0) {
        setUploadMsg({ type: 'error', text: 'No valid pincode rows found' });
        return;
      }
      const merged = db.addPincodes(parsed);
      setPincodes(merged);
      setUploadMsg({ type: 'success', text: `Imported ${parsed.length} pincodes` });
    } catch {
      setUploadMsg({ type: 'error', text: 'Failed to parse pincode CSV' });
    }
  }, [setPincodes]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleOrderCSV(file);
  }, [handleOrderCSV]);

  // ─── Filter & search ───────────────────────────────────────────────────────
  const filtered = orders.filter((o) => {
    const matchesSearch = search === '' ||
      o.order_id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      o.pincode.includes(search) ||
      o.area_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ─── Quick add form ─────────────────────────────────────────────────────────
  const [newOrder, setNewOrder] = useState<Partial<Order>>({
    customer_name: '', pincode: '', area_name: '', address: '', priority: 'Normal', weight: 1
  });

  const handleAddOrder = () => {
    const order: Order = {
      order_id: `ORD-${Date.now()}`,
      customer_name: newOrder.customer_name || 'Unknown',
      pincode: newOrder.pincode || '',
      area_name: newOrder.area_name || '',
      address: newOrder.address || '',
      order_date: new Date().toISOString().split('T')[0],
      status: 'Pending',
      priority: (newOrder.priority as Order['priority']) || 'Normal',
      weight: newOrder.weight || 1,
    };

    // Enrich with coords from pincode map
    const rec = pincodes.find((p) => p.pincode === order.pincode);
    if (rec) { order.lat = rec.lat; order.lng = rec.lng; order.area_name = order.area_name || rec.area_name; }

    const merged = db.addOrders([order]);
    setOrders(merged);
    setShowAddModal(false);
    setNewOrder({ customer_name: '', pincode: '', area_name: '', address: '', priority: 'Normal', weight: 1 });
    setUploadMsg({ type: 'success', text: `Added order ${order.order_id}` });
  };

  const statusBadge = (status: string) => {
    const cls: Record<string, string> = {
      Pending: 'badge-pending', Allocated: 'badge-allocated',
      'In Transit': 'badge-transit', Delivered: 'badge-delivered', Failed: 'badge-failed'
    };
    return <span className={`badge ${cls[status] || 'badge-pending'}`}>{status}</span>;
  };

  const priorityBadge = (pri: string) => {
    const cls: Record<string, string> = {
      Low: 'badge-low', Normal: 'badge-normal', High: 'badge-high', Urgent: 'badge-urgent'
    };
    return <span className={`badge ${cls[pri] || 'badge-normal'}`}>{pri}</span>;
  };

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem' }}>Orders</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Upload CSV or manually add orders for delivery planning
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => pincodeInputRef.current?.click()}>
            <MapPin size={14} /> Upload Pincodes
          </button>
          <button className="btn btn-secondary" onClick={() => exportOrders(orders, zones)}>
            <Download size={14} /> Export
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={14} /> Add Order
          </button>
        </div>
      </div>

      {/* Upload message */}
      {uploadMsg && (
        <div className={`alert ${uploadMsg.type === 'success' ? 'alert-success' : 'alert-danger'}`}
          style={{ marginBottom: '16px' }}>
          {uploadMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span style={{ flex: 1 }}>{uploadMsg.text}</span>
          <X size={14} style={{ cursor: 'pointer', opacity: 0.6 }} onClick={() => setUploadMsg(null)} />
        </div>
      )}

      {/* Geocode progress */}
      {geocodeProgress && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.8rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
            Geocoding orders... {geocodeProgress.done} / {geocodeProgress.total}
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(geocodeProgress.done / geocodeProgress.total) * 100}%` }} />
          </div>
        </div>
      )}

      {/* CSV Upload Zone */}
      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        style={{ marginBottom: '20px' }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => orderInputRef.current?.click()}
      >
        <Upload size={28} style={{ color: 'var(--accent)' }} />
        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Drop your orders CSV here
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          or click to browse · Columns: order_id, customer_name, pincode, area, address, status, priority, weight
        </div>
      </div>

      {/* Hidden file inputs */}
      <input ref={orderInputRef} type="file" accept=".csv" hidden
        onChange={(e) => { if (e.target.files?.[0]) handleOrderCSV(e.target.files[0]); }} />
      <input ref={pincodeInputRef} type="file" accept=".csv" hidden
        onChange={(e) => { if (e.target.files?.[0]) handlePincodeCSV(e.target.files[0]); }} />

      {/* Filters & search */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              placeholder="Search by ID, name, pincode, area..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
            <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '140px' }}>
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Allocated">Allocated</option>
              <option value="In Transit">In Transit</option>
              <option value="Delivered">Delivered</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {filtered.length} of {orders.length} orders
          </div>
          {orders.length > 0 && (
            <button className="btn btn-sm btn-danger" onClick={() => { db.clearOrders(); setOrders([]); }}>
              <Trash2 size={12} /> Clear All
            </button>
          )}
        </div>
      </div>

      {/* Orders table */}
      {filtered.length > 0 ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Pincode</th>
                <th>Area</th>
                <th>Date</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Wt (kg)</th>
                <th>Coords</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((o) => (
                <tr key={o.order_id}>
                  <td className="font-mono" style={{ fontSize: '0.72rem' }}>{o.order_id}</td>
                  <td>{o.customer_name}</td>
                  <td className="font-mono">{o.pincode}</td>
                  <td>{o.area_name}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{o.order_date}</td>
                  <td>{statusBadge(o.status)}</td>
                  <td>{priorityBadge(o.priority)}</td>
                  <td>{o.weight}</td>
                  <td>
                    {o.lat && o.lng ? (
                      <span className="badge badge-delivered" style={{ fontSize: '0.6rem' }}>✓ Located</span>
                    ) : (
                      <span className="badge badge-failed" style={{ fontSize: '0.6rem' }}>No coords</span>
                    )}
                  </td>
                  <td>
                    <button className="btn btn-sm btn-danger" style={{ padding: '3px 6px' }}
                      onClick={() => { db.deleteOrder(o.order_id); setOrders(orders.filter((x) => x.order_id !== o.order_id)); }}>
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 200 && (
            <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Showing first 200 of {filtered.length} results
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <FileSpreadsheet size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            No orders yet
          </div>
          <div style={{ fontSize: '0.78rem', marginTop: '6px' }}>
            Upload a CSV file or click "Add Order" to get started
          </div>
        </div>
      )}

      {/* Pincode info */}
      <div style={{ marginTop: '16px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
        📍 {pincodes.length} pincodes loaded (built-in: 80+ Mumbai area pincodes)
      </div>

      {/* Add Order Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <h3>Add New Order</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowAddModal(false)}>
                <X size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <input className="form-input" value={newOrder.customer_name}
                  onChange={(e) => setNewOrder({ ...newOrder, customer_name: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input className="form-input" value={newOrder.pincode}
                    onChange={(e) => setNewOrder({ ...newOrder, pincode: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Area Name</label>
                  <input className="form-input" value={newOrder.area_name}
                    onChange={(e) => setNewOrder({ ...newOrder, area_name: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="form-input" value={newOrder.address}
                  onChange={(e) => setNewOrder({ ...newOrder, address: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-select" value={newOrder.priority}
                    onChange={(e) => setNewOrder({ ...newOrder, priority: e.target.value as Order['priority'] })}>
                    <option>Low</option>
                    <option>Normal</option>
                    <option>High</option>
                    <option>Urgent</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Weight (kg)</label>
                  <input className="form-input" type="number" value={newOrder.weight}
                    onChange={(e) => setNewOrder({ ...newOrder, weight: parseFloat(e.target.value) || 1 })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleAddOrder}
                  disabled={!newOrder.customer_name || !newOrder.pincode}>
                  <Plus size={14} /> Add Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
