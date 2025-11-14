'use client';

import { useEffect, useMemo, useRef } from 'react';
import type maplibregl from 'maplibre-gl';
import { createPortal } from 'react-dom';

type Props = {
  map: maplibregl.Map;
  enabled: boolean;
};

export default function TomTomTrafficLegend({ map, enabled }: Props) {
  const portalNode = useMemo(() => {
    const div = document.createElement('div');
    div.className = 'tomtom-legend';
    return div;
  }, []);

  useEffect(() => {
    const container = (map?.getContainer?.() as HTMLElement) ?? document.body;
    container.appendChild(portalNode);
    return () => {
      if (container.contains(portalNode)) {
        container.removeChild(portalNode);
      }
    };
  }, [map, portalNode]);

  if (!enabled) return null;

  return createPortal(
    <div
      style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        background: 'rgba(6, 13, 24, 0.7)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '8px',
        padding: '8px 12px',
        color: '#f0f3ff',
        fontSize: '11px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        zIndex: 1000,
        opacity: 0.85,
      }}
    >
      <div style={{ fontWeight: 500, marginBottom: '6px', fontSize: '11px', opacity: 0.9 }}>
        Traffic Flow
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '16px',
              height: '3px',
              background: '#4ade80',
              borderRadius: '1px',
            }}
          />
          <span style={{ opacity: 0.75, fontSize: '10px' }}>Free flow</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '16px',
              height: '3px',
              background: '#facc15',
              borderRadius: '1px',
            }}
          />
          <span style={{ opacity: 0.75, fontSize: '10px' }}>Moderate</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '16px',
              height: '3px',
              background: '#f97316',
              borderRadius: '1px',
            }}
          />
          <span style={{ opacity: 0.75, fontSize: '10px' }}>Heavy</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '16px',
              height: '3px',
              background: '#ef4444',
              borderRadius: '1px',
            }}
          />
          <span style={{ opacity: 0.75, fontSize: '10px' }}>Severe</span>
        </div>
      </div>
    </div>,
    portalNode
  );
}

