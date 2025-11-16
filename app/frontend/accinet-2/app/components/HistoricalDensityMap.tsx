'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { MAPTILER_KEY } from '../lib/keys';
import {
  parseHistoricalData,
  getAvailableYears,
  filterByYearRange,
  type HistoricalCellRecord,
} from '../lib/historicalData';
import HistoricalCrashDensityLayer from './HistoricalCrashDensityLayer';
import TimeSeriesSelector from './TimeSeriesSelector';

const INITIAL_CENTER: [number, number] = [-96.8, 32.9]; // Texas center
const INITIAL_ZOOM = 8;

const HistoricalDensityMap: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapStyledRef = useRef(false);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [data, setData] = useState<HistoricalCellRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  const [heatmapRadius, setHeatmapRadius] = useState(50);
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.7);
  const [updating, setUpdating] = useState(false);

  const availableYears = useMemo(() => getAvailableYears(data), [data]);
  const filteredData = useMemo(() => {
    if (!selectedRange || !data.length) return [];
    return filterByYearRange(data, selectedRange.start, selectedRange.end);
  }, [data, selectedRange]);

  const densityStats = useMemo(() => {
    if (!filteredData.length) return null;
    let min = Infinity;
    let max = -Infinity;
    for (const record of filteredData) {
      const value = record.crash_density;
      if (!Number.isFinite(value)) continue;
      if (value < min) min = value;
      if (value > max) max = value;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    return { min, max };
  }, [filteredData]);

  const applyMapStyling = useCallback((map: maplibregl.Map) => {
    const style = map.getStyle();
    if (!style?.layers) return;

    const advancedMap = map as maplibregl.Map & {
      setFog?: (fog: any) => void;
      setLight?: (light: any) => void;
    };

    advancedMap.setFog?.({
      range: [0.6, 8],
      color: '#010409',
      'horizon-blend': 0.1,
      'high-color': '#17223b',
      'space-color': '#010409',
    });

    advancedMap.setLight?.({
      color: '#7dd3fc',
      intensity: 0.5,
      anchor: 'viewport',
      position: [1.15, 210, 80],
    });

    const updatePaint = (matcher: RegExp, type: string, props: Record<string, unknown>) => {
      for (const layer of style.layers ?? []) {
        if (matcher.test(layer.id) && layer.type === type) {
          for (const [prop, value] of Object.entries(props)) {
            try {
              map.setPaintProperty(layer.id, prop, value as any);
            } catch {
              // ignore missing paint properties
            }
          }
        }
      }
    };

    updatePaint(/water/i, 'fill', {
      'fill-color': '#050c18',
      'fill-opacity': 0.95,
    });

    updatePaint(/landcover|landuse|park/i, 'fill', {
      'fill-color': '#060a12',
    });

    updatePaint(/building/i, 'fill-extrusion', {
      'fill-extrusion-color': '#0d182a',
      'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 12, 0, 16, 40],
      'fill-extrusion-opacity': 0.65,
    });

    updatePaint(/road.*(major|trunk|primary)/i, 'line', {
      'line-color': ['interpolate', ['linear'], ['zoom'], 6, '#1f2b3f', 10, '#35c5ff', 15, '#ffe08a'],
      'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1.2, 12, 3.5, 16, 7],
      'line-opacity': 0.9,
    });

    updatePaint(/road.*(secondary|tertiary|minor)/i, 'line', {
      'line-color': ['interpolate', ['linear'], ['zoom'], 8, '#1c2435', 13, '#3fb7ff'],
      'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.6, 14, 2],
      'line-opacity': 0.75,
    });

    updatePaint(/road.*case/i, 'line', {
      'line-color': '#010409',
      'line-opacity': 0.35,
    });

    if (!mapStyledRef.current) {
      map.setPitch(0);
      map.setBearing(0);
      mapStyledRef.current = true;
    }
  }, []);

  // Load historical data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load from public folder
        const response = await fetch('/historical_all_cells.json');
        if (!response.ok) {
          throw new Error(`Failed to fetch historical data: ${response.status}`);
        }

        const rawData = await response.json();
        const parsed = parseHistoricalData(rawData);
        setData(parsed);

        if (parsed.length > 0) {
          const years = getAvailableYears(parsed);
          const latest = years[years.length - 1];
          setSelectedRange({ start: latest, end: latest });
        }
      } catch (err: any) {
        console.error('Error loading historical data:', err);
        setError(err.message || 'Failed to load historical crash data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Initialize map
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        const styleURL = `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_KEY}`;
        const response = await fetch(styleURL);
        if (cancelled) return;

        if (!response.ok) {
          throw new Error(`Failed to fetch MapTiler style (${response.status})`);
        }
        const style = await response.json();

        const map = new maplibregl.Map({
          container,
          style,
          center: INITIAL_CENTER,
          zoom: INITIAL_ZOOM,
          attributionControl: false,
          maplibreLogo: false,
        });

        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl(), 'top-right');
        map.on('error', (e) => console.error('MapLibre error:', e?.error || e));

        const handleStyleData = () => applyMapStyling(map);

        map.on('load', () => {
          if (cancelled) return;
          applyMapStyling(map);
          setMapLoaded(true);
        });

        map.on('styledata', handleStyleData);
      } catch (err) {
        console.error('Error creating map:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize map');
      }
    })();

    return () => {
      cancelled = true;
      setMapLoaded(false);
      mapStyledRef.current = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [applyMapStyling]);

  useEffect(() => {
    setSelectedRange((prev) => {
      if (!availableYears.length) {
        return prev === null ? prev : null;
      }

      const fallback = {
        start: availableYears[availableYears.length - 1],
        end: availableYears[availableYears.length - 1],
      };

      if (!prev) return fallback;

      const clampToYears = (year: number) => {
        if (availableYears.includes(year)) return year;
        let closest = availableYears[0];
        let minDiff = Math.abs(year - closest);
        for (const candidate of availableYears) {
          const diff = Math.abs(candidate - year);
          if (diff < minDiff) {
            minDiff = diff;
            closest = candidate;
          }
        }
        return closest;
      };

      const clampedStart = clampToYears(prev.start);
      const clampedEnd = clampToYears(prev.end);
      const start = Math.min(clampedStart, clampedEnd);
      const end = Math.max(clampedStart, clampedEnd);

      if (start === prev.start && end === prev.end) return prev;
      return { start, end };
    });
  }, [availableYears]);

  // Handle radius changes with loading indicator
  const handleRadiusChange = useCallback((value: number) => {
    setHeatmapRadius(value);
    setUpdating(true);
  }, []);

  // Handle opacity changes with loading indicator
  const handleOpacityChange = useCallback((value: number) => {
    setHeatmapOpacity(value);
    setUpdating(true);
  }, []);

  // Handle year range changes with loading indicator
  const handleRangeChange = useCallback((start: number, end: number) => {
    setUpdating(true);
    setSelectedRange({ start, end });
  }, []);

  // Handle update completion from the heatmap layer
  const handleUpdateComplete = useCallback(() => {
    console.log('Update complete');
    setUpdating(false);
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        height: '100vh',
        width: '100%',
      }}
    >
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Time Series Selector */}
      {mapLoaded && availableYears.length > 0 && selectedRange && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[2147483647] pointer-events-none">
          <TimeSeriesSelector
            years={availableYears}
            range={selectedRange}
            onRangeChange={handleRangeChange}
            className="pointer-events-auto"
          />
        </div>
      )}

      {/* Controls Panel */}
      {mapLoaded && (
        <div className="fixed bottom-4 right-4 z-[2147483647] pointer-events-none">
          <div className="glass-panel glass-panel--strong rounded-2xl p-4 pointer-events-auto w-[280px]">
            <h3 className="text-sm font-semibold text-white mb-3 m-0">Heatmap Controls</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs text-gray-300">Radius</label>
                  <span className="text-xs text-gray-400">{heatmapRadius}px</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  step={5}
                  value={heatmapRadius}
                  onChange={(e) => handleRadiusChange(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs text-gray-300">Opacity</label>
                  <span className="text-xs text-gray-400">{Math.round(heatmapOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={heatmapOpacity}
                  onChange={(e) => handleOpacityChange(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {filteredData.length > 0 && selectedRange && densityStats && (
              <div className="mt-4 pt-4 border-t border-white/8">
                <div className="text-xs text-gray-400">
                  <div>
                    Showing{' '}
                    <strong className="text-white">{filteredData.length.toLocaleString()}</strong> cells for{' '}
                    <span className="text-white">
                      {selectedRange.start} – {selectedRange.end}
                    </span>
                  </div>
                  <div className="mt-1">
                    Density range:{' '}
                    <strong className="text-white">
                      {densityStats.min.toFixed(2)} – {densityStats.max.toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      {mapLoaded && (
        <div className="fixed bottom-4 left-4 z-[2147483647] pointer-events-none">
          <div className="glass-panel glass-panel--strong rounded-2xl p-4 pointer-events-auto w-[240px]">
            <h3 className="text-sm font-semibold text-white mb-3 m-0">Crash Density</h3>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#0ea5e9' }} />
                <span className="text-xs text-gray-300">Minimal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22d3ee' }} />
                <span className="text-xs text-gray-300">Very Low</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#60a5fa' }} />
                <span className="text-xs text-gray-300">Low</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#facc15' }} />
                <span className="text-xs text-gray-300">Moderate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }} />
                <span className="text-xs text-gray-300">High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
                <span className="text-xs text-gray-300">Very High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#dc2626' }} />
                <span className="text-xs text-gray-300">Extreme</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading/Error States */}
      {(loading || updating) && (
        <div className="fixed inset-0 z-[2147483648] flex items-center justify-center pointer-events-none">
          <div className="glass-panel glass-panel--strong rounded-2xl p-6 pointer-events-auto">
            <div className="text-white text-center">
              <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm">{loading ? 'Loading historical crash data...' : 'Updating visualization...'}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed top-4 left-4 z-[2147483648] pointer-events-none">
          <div className="glass-panel glass-panel--strong rounded-2xl p-4 pointer-events-auto border border-red-500/30 bg-red-500/10">
            <p className="text-sm text-red-200 m-0">{error}</p>
          </div>
        </div>
      )}

      {/* Heatmap Layer */}
      {mapLoaded && mapRef.current && selectedRange && filteredData.length > 0 && (
        <HistoricalCrashDensityLayer
          map={mapRef.current}
          enabled={true}
          data={filteredData}
          radiusPx={heatmapRadius}
          opacity={heatmapOpacity}
          onUpdateComplete={handleUpdateComplete}
        />
      )}
    </div>
  );
};

export default HistoricalDensityMap;