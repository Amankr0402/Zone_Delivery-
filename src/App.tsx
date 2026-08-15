import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Zones from './pages/Zones';
import Vehicles from './pages/Vehicles';
import Schedule from './pages/Schedule';
import type { Order, PincodeRecord, Zone, Vehicle, WeeklySlot } from './types';
import { db } from './db';

function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pincodes, setPincodes] = useState<PincodeRecord[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [slots, setSlots] = useState<WeeklySlot[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    setOrders(db.getOrders());
    setPincodes(db.getPincodes());
    setZones(db.getZones());
    setVehicles(db.getVehicles());
    setSlots(db.getWeeklySlots());
    setIsLoaded(true);
  }, []);

  if (!isLoaded) return null;

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <div className="page-content">
          <Routes>
            <Route path="/" element={
              <Dashboard 
                orders={orders} 
                zones={zones} 
                vehicles={vehicles} 
                slots={slots} 
                pincodes={pincodes}
              />
            } />
            <Route path="/orders" element={
              <Orders 
                orders={orders} 
                setOrders={setOrders} 
                pincodes={pincodes} 
                setPincodes={setPincodes}
                zones={zones}
              />
            } />
            <Route path="/zones" element={
              <Zones 
                orders={orders} 
                setOrders={setOrders} 
                zones={zones} 
                setZones={setZones} 
                pincodes={pincodes}
              />
            } />
            <Route path="/vehicles" element={
              <Vehicles 
                vehicles={vehicles} 
                setVehicles={setVehicles} 
              />
            } />
            <Route path="/schedule" element={
              <Schedule 
                orders={orders} 
                zones={zones} 
                vehicles={vehicles} 
                slots={slots} 
                setSlots={setSlots} 
              />
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
