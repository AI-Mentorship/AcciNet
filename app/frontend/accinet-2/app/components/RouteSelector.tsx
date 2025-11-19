'use client';

import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Draggable from 'react-draggable';
import { ExternalLink } from 'lucide-react';

type RouteInfo = {
  id: string;
  name: string;
  avgRisk: number;
  durationSec: number;
  distanceMeters: number;
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  coords?: [number, number][]; // Route coordinates [lng, lat]
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
  const selectorDrag = useRef(null)
  
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

  const openInGoogleMaps = (route: RouteInfo) => {
    if (!route.origin || !route.destination) return;
    
    const origin = `${route.origin.lat},${route.origin.lng}`;
    const destination = `${route.destination.lat},${route.destination.lng}`;
    
    // Extract waypoints along the route to guide Google Maps
    // Sample 8-10 waypoints evenly spaced along the route
    let waypointsParam = '';
    if (route.coords && route.coords.length > 2) {
      const numWaypoints = Math.min(8, Math.floor(route.coords.length / 10)); // Max 8 waypoints
      const waypoints: string[] = [];
      
      for (let i = 1; i < numWaypoints; i++) {
        const idx = Math.floor((i / numWaypoints) * route.coords.length);
        const [lng, lat] = route.coords[idx];
        waypoints.push(`${lat},${lng}`);
      }
      
      if (waypoints.length > 0) {
        waypointsParam = `&waypoints=${waypoints.join('|')}`;
      }
    }
    
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointsParam}&travelmode=driving`;
    
    window.open(url, '_blank');
  };

  const ui = (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '16px',
        width: '300px',
      }}
      className="no-scrollbar pointer-events-none"
    >
      <Draggable handle=".drag-handle" nodeRef={selectorDrag}>
        <div className="drag-handle w-full cursor-grab" ref={selectorDrag}>
          <div className="glass-panel glass-panel--strong rounded-2xl p-3 pointer-events-auto"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMinimized ? '0' : '10px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                Routes ({routes.length})
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
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                  <button
                    onClick={onSelectAll}
                    style={{
                      flex: 1,
                      padding: '5px 10px',
                      background: 'rgba(99, 102, 241, 0.2)',
                      border: '1px solid rgba(99, 102, 241, 0.4)',
                      borderRadius: '6px',
                      color: '#c7d2fe',
                      fontSize: '10px',
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
                    All
                  </button>
                  <button
                    onClick={onDeselectAll}
                    style={{
                      flex: 1,
                      padding: '5px 10px',
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      borderRadius: '6px',
                      color: '#fca5a5',
                      fontSize: '10px',
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
                    None
                  </button>
                </div>

                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {routes.map((route) => {
                      const isSelected = selectedRouteIds.has(route.id);
                      return (
                        <div
                          key={route.id}
                          style={{
                            padding: '8px',
                            background: isSelected
                              ? 'rgba(99, 102, 241, 0.15)'
                              : 'rgba(255, 255, 255, 0.03)',
                            border: `1px solid ${
                              isSelected ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.08)'
                            }`,
                            borderRadius: '8px',
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => onRouteToggle(route.id)}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: '16px',
                                height: '16px',
                                cursor: 'pointer',
                                accentColor: '#6366f1',
                              }}
                            />
                            <div style={{ flex: 1 }}>
                              <span style={{ fontWeight: 500, fontSize: '12px' }}>{route.name}</span>
                            </div>
                            {route.origin && route.destination && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openInGoogleMaps(route);
                                }}
                                style={{
                                  padding: '4px 8px',
                                  background: 'rgba(56, 189, 248, 0.2)',
                                  border: '1px solid rgba(56, 189, 248, 0.4)',
                                  borderRadius: '4px',
                                  color: '#38bdf8',
                                  fontSize: '10px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  fontWeight: 500,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.background = 'rgba(56, 189, 248, 0.3)';
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)';
                                }}
                                title="Open in Google Maps"
                              >
                                <ExternalLink size={11} />
                                Maps
                              </button>
                            )}
                          </div>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, 1fr)',
                              gap: '6px',
                              fontSize: '10px',
                            }}
                          >
                            <div>
                              <div style={{ opacity: 0.5, marginBottom: '2px', fontSize: '9px' }}>Risk</div>
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
                              <div style={{ opacity: 0.5, marginBottom: '2px', fontSize: '9px' }}>Time</div>
                              <div style={{ fontWeight: 500 }}>{formatDuration(route.durationSec)}</div>
                            </div>
                            <div>
                              <div style={{ opacity: 0.5, marginBottom: '2px', fontSize: '9px' }}>Distance</div>
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
        </div>
      </Draggable>
    </div>
  );

  const body = typeof document !== 'undefined' ? document.body : null;
  return body ? createPortal(ui, body) : ui;
}

