'use client';

import React, { useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { ExternalLink } from 'lucide-react';

type FullRouteInfo = {
  id: string;
  name: string;
  avgRisk: number;
  durationSec: number;
  distanceMeters: number;
  origin?: { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number } | null;
  coords?: [number, number][]; // Route coordinates [lng, lat]
};

type Props = {
  route: FullRouteInfo;
};

export default function ConfigBox({route} : Props) {
    const selectorDrag = useRef(null);
    const [isMinimized, setIsMinimized] = useState(false)

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

    const openInGoogleMaps = () => {
        if (!route.origin || !route.destination) return;
        
        const origin = `${route.origin.lat},${route.origin.lng}`;
        const destination = `${route.destination.lat},${route.destination.lng}`;
        
        let waypointsParam = '';
        if (route.coords && route.coords.length > 2) {
            const numWaypoints = Math.min(8, Math.floor(route.coords.length / 10));
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

    return (
        <div
            style={{
            position: 'fixed',
            width: 'auto',
            transform: 'translate(-50%, -100%)'
            }}
            className="no-scrollbar pointer-events-none"
        >
            <div className="glass-panel glass-panel--strong rounded-xl p-3 pointer-events-auto">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div
                            style={{
                                padding: '8px 12px',
                                background: 'rgba(74, 222, 128, 0.2)',
                                border: '1px solid rgba(74, 222, 128, 0.5)',
                                borderRadius: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                minWidth: '70px',
                            }}
                        >
                            <div style={{ fontSize: '10px', opacity: 0.7, marginBottom: '2px' }}>Risk</div>
                            <div style={{ fontWeight: 600, fontSize: '14px', color: '#4ade80' }}>
                                {formatRisk(route.avgRisk)}
                            </div>
                        </div>

                        <div
                            style={{
                                padding: '8px 12px',
                                background: 'rgba(59, 130, 246, 0.2)',
                                border: '1px solid rgba(59, 130, 246, 0.5)',
                                borderRadius: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                minWidth: '70px',
                            }}
                        >
                            <div style={{ fontSize: '10px', opacity: 0.7, marginBottom: '2px' }}>Time</div>
                            <div style={{ fontWeight: 600, fontSize: '14px', color: '#3b82f6' }}>
                                {formatDuration(route.durationSec)}
                            </div>
                        </div>

                        <div
                            style={{
                                padding: '8px 12px',
                                background: 'rgba(249, 115, 22, 0.2)',
                                border: '1px solid rgba(249, 115, 22, 0.5)',
                                borderRadius: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                minWidth: '70px',
                            }}
                        >
                            <div style={{ fontSize: '10px', opacity: 0.7, marginBottom: '2px' }}>Distance</div>
                            <div style={{ fontWeight: 600, fontSize: '14px', color: '#f97316' }}>
                                {formatDistance(route.distanceMeters)}
                            </div>
                        </div>
                        {route.origin && route.destination && (
                            <button
                                onClick={openInGoogleMaps}
                                style={{
                                    padding: '6px 10px',
                                    background: 'rgba(56, 189, 248, 0.2)',
                                    border: '1px solid rgba(56, 189, 248, 0.4)',
                                    borderRadius: '6px',
                                    color: '#38bdf8',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontWeight: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    flexShrink: 0,
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'rgba(56, 189, 248, 0.3)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)';
                                }}
                                title="Open in Google Maps"
                            >
                                <ExternalLink size={12} />
                                Maps
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}