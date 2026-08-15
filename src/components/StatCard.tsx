import React from 'react';
import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  variant?: 'accent' | 'success' | 'warning' | 'danger';
  subtitle?: string;
}

export default function StatCard({ label, value, icon, variant = 'accent', subtitle }: StatCardProps) {
  const colors = {
    accent: '#818cf8',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#f43f5e',
  };

  return (
    <div className={`stat-card ${variant}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span className="stat-label">{label}</span>
        <div style={{ color: colors[variant], opacity: 0.7 }}>
          {icon}
        </div>
      </div>
      <div className="stat-value" style={{ color: colors[variant] }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
