import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Package, Map, Truck, CalendarDays, LayoutDashboard, Settings
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/orders', icon: Package, label: 'Orders' },
  { to: '/zones', icon: Map, label: 'Zones' },
  { to: '/vehicles', icon: Truck, label: 'Vehicles' },
  { to: '/schedule', icon: CalendarDays, label: 'Schedule' },
];

export default function Navbar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">
          <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
            <path
              d="M3 7l6-4 6 4 6-4v14l-6 4-6-4-6 4V7z"
              stroke="white"
              strokeWidth="1.8"
              strokeLinejoin="round"
              fill="none"
            />
            <path d="M9 3v14" stroke="white" strokeWidth="1.5" opacity="0.6" />
            <path d="M15 7v14" stroke="white" strokeWidth="1.5" opacity="0.6" />
          </svg>
        </div>
        <div className="brand-name">Zone Delivery</div>
        <div className="brand-sub">Smart Route Planner</div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}

        <div style={{ flex: 1 }} />

        <div className="nav-section-label">System</div>
        <NavLink
          to="/settings"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <Settings size={16} />
          Settings
        </NavLink>
      </nav>
    </aside>
  );
}
