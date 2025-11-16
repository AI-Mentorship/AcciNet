'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';

type RouteInfo = {
  id: string;
  name: string;
  avgRisk: number;
  durationSec: number;
  distanceMeters: number;
};

type Props = {
  routes: RouteInfo[];
  selectedRouteIds: Set<string>;
  onRouteToggle: (routeId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
};

export default function RouteSelector({
  routes,
  selectedRouteIds,
  onRouteToggle,
  onSelectAll,
  onDeselectAll,
}: Props) {
  const [isMinimized, setIsMinimized] = useState(false);
  
  if (routes.length === 0) return null;

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters: number): string => {
    const km = meters / 1000;
    if (km < 1) return `${Math.round(meters)}m`;
    return `${km.toFixed(1)}km`;
  };

  const formatRisk = (risk: number): string => {
    return `${(risk * 100).toFixed(1)}%`;
  };

  const getRiskColor = (risk: number): string => {
    if (risk < 0.3) return '#4ade80'; // green
    if (risk < 0.6) return '#facc15'; // yellow
    return '#ef4444'; // red
  };

  const ui = (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '16px',
        width: '360px',
        maxHeight: isMinimized ? 'auto' : 'calc(100vh - 200px)',
        background: 'rgba(6, 13, 24, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '16px',
        padding: isMinimized ? '12px 16px' : '16px',
        color: '#f0f3ff',
        fontSize: '13px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        zIndex: 1000,
        overflowY: isMinimized ? 'hidden' : 'auto',
        transition: 'all 0.3s ease',
      }}
      className="no-scrollbar"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMinimized ? '0' : '16px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#fff' }}>
          Route Selection
        </h3>
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#f0f3ff',
            transition: 'all 0.2s',
            padding: 0,
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          }}
          aria-label={isMinimized ? 'Expand' : 'Minimize'}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              transform: isMinimized ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease',
            }}
          >
            <path d="M4 6 L8 10 L12 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {!isMinimized && (
        <>
          <p style={{ margin: '0 0 12px 0', fontSize: '11px', opacity: 0.7 }}>
            Select routes to display on the map. Click on routes to see details.
          </p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              onClick={onSelectAll}
              style={{
                flex: 1,
                padding: '6px 12px',
                background: 'rgba(99, 102, 241, 0.2)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                borderRadius: '8px',
                color: '#c7d2fe',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
              }}
            >
              Select All
            </button>
            <button
              onClick={onDeselectAll}
              style={{
                flex: 1,
                padding: '6px 12px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '8px',
                color: '#fca5a5',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              }}
            >
              Deselect All
            </button>
          </div>

          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 500, color: '#fff' }}>
              Routes ({routes.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {routes.map((route) => {
                const isSelected = selectedRouteIds.has(route.id);
                return (
                  <div
                    key={route.id}
                    style={{
                      padding: '12px',
                      background: isSelected
                        ? 'rgba(99, 102, 241, 0.15)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${
                        isSelected ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.08)'
                      }`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => onRouteToggle(route.id)}
                    onMouseOver={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onRouteToggle(route.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          accentColor: '#6366f1',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 500, fontSize: '13px' }}>{route.name}</span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '8px',
                        fontSize: '11px',
                        marginTop: '8px',
                      }}
                    >
                      <div>
                        <div style={{ opacity: 0.6, marginBottom: '2px' }}>Risk</div>
                        <div
                          style={{
                            fontWeight: 600,
                            color: getRiskColor(route.avgRisk),
                          }}
                        >
                          {formatRisk(route.avgRisk)}
                        </div>
                      </div>
                      <div>
                        <div style={{ opacity: 0.6, marginBottom: '2px' }}>Time</div>
                        <div style={{ fontWeight: 500 }}>{formatDuration(route.durationSec)}</div>
                      </div>
                      <div>
                        <div style={{ opacity: 0.6, marginBottom: '2px' }}>Distance</div>
                        <div style={{ fontWeight: 500 }}>{formatDistance(route.distanceMeters)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const body = typeof document !== 'undefined' ? document.body : null;
  return body ? createPortal(ui, body) : ui;
}

