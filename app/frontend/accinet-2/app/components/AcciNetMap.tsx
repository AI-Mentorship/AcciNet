'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { GOOGLE_API_KEY, HERE_API_KEY, MAPTILER_KEY } from '../lib/keys';
import type { GoogleRoute } from '../lib/routes';

import RouteBox from './RouteBox';
import WeatherBox from './WeatherBox';
import MultiRouteGradientLayer from './MultiRouteGradientLayer';
import ConfigBox from './ConfigBox';
import Sidebar from './Sidebar';
import RoadsLayer from './RoadsLayer';
import HexRiskLayer from './HexGridOverlay';
import HeatmapRiskLayer from './HeatMapRiskLayer';
import HereTrafficLayer from './HereTrafficLayer';

type RouteItem = {
  coords: [number, number][];
  probs: number[];
  durationSec: number;
  distanceMeters: number;
  avgRisk: number;
};

type RouteTheme = 'safe' | 'moderate' | 'risky';

const INITIAL_CENTER: [number, number] = [-96.8, 32.9];
const INITIAL_ZOOM = 10;

const AcciNetMap: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapStyledRef = useRef(false);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: INITIAL_CENTER[1], lng: INITIAL_CENTER[0] });
  const [mapZoom, setMapZoom] = useState(INITIAL_ZOOM);

  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [safestIdx, setSafestIdx] = useState(-1);
  const [fastestIdx, setFastestIdx] = useState(-1);
  const [fuelIdx, setFuelIdx] = useState(-1);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showHex, setShowHex] = useState(false);
  const [showGlow, setShowGlow] = useState(true);
  const [showRoadRisk, setShowRoadRisk] = useState(true);
  const [showTraffic, setShowTraffic] = useState(true);
  const [cityGlowRadius, setCityGlowRadius] = useState(90);
  const [viewMode, setViewMode] = useState<'historical' | 'predictive'>('predictive');
  const [selectType, setSelectType] = useState<'segment' | 'points'>('segment');

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

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        const style = await loadMapStyle();
        if (cancelled) return;

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

        const handleMoveOrZoom = () => {
          const center = map.getCenter();
          setMapCenter({ lat: center.lat, lng: center.lng });
          setMapZoom(map.getZoom());
        };
        const handleStyleData = () => applyMapStyling(map);

        map.on('load', () => {
          if (cancelled) return;
          applyMapStyling(map);
          handleMoveOrZoom();
          setMapLoaded(true);
        });

        map.on('styledata', handleStyleData);
        map.on('moveend', handleMoveOrZoom);
        map.on('zoomend', handleMoveOrZoom);

        // ensure center sync even before move events
        handleMoveOrZoom();
      } catch (err) {
        console.error('Error creating map:', err);
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

  const onRoutes = useCallback((incoming: GoogleRoute[]) => {
    if (!incoming.length) {
      setRoutes([]);
      setSafestIdx(-1);
      setFastestIdx(-1);
      setFuelIdx(-1);
      return;
    }

    const items = incoming.map((route) => {
      const coords = normalizeCoords(route.coords);
      const probs = simulateProbs(coords);
      const avgRisk = probs.length ? probs.reduce((acc, value) => acc + value, 0) / probs.length : 0.5;
      const distanceMeters = route.distanceMeters || estimateDistanceMeters(coords);
      return {
        coords,
        probs,
        durationSec: route.durationSec,
        distanceMeters,
        avgRisk,
      } satisfies RouteItem;
    });

    const safest = indexOfMin(items.map((r) => r.avgRisk));
    const fastest = indexOfMin(items.map((r) => r.durationSec));
    const fuelSaver = indexOfMin(items.map((r) => r.distanceMeters));

    setRoutes(items);
    setSafestIdx(safest);
    setFastestIdx(fastest);
    setFuelIdx(fuelSaver);

    const map = mapRef.current;
    if (!map) return;
    const allCoords = items.flatMap((r) => r.coords);
    if (!allCoords.length) return;
    const bounds = allCoords.reduce(
      (bb, coord) => bb.extend(coord),
      new maplibregl.LngLatBounds(allCoords[0], allCoords[0])
    );
    map.fitBounds(bounds, { padding: 64, duration: 600 });
  }, []);

  const resetRoutes = useCallback(() => {
    setRoutes([]);
    setSafestIdx(-1);
    setFastestIdx(-1);
    setFuelIdx(-1);
  }, []);

  const gradientRoutes = useMemo(() => {
    if (!mapLoaded || !mapRef.current || !routes.length) return [];
    return routes.map((route, idx) => {
      let theme: RouteTheme = 'risky';
      if (idx === safestIdx) theme = 'safe';
      else if (idx === fastestIdx) theme = 'moderate';
      return {
        id: `route-${idx}`,
        coords: route.coords,
        probs: route.probs,
        theme,
      };
    });
  }, [fastestIdx, mapLoaded, routes, safestIdx]);

  return (
    <div
      style={{
        position: 'relative',
        height: '100vh',
        width: '100%',
      }}
    >
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {mapLoaded && mapRef.current && (
        <>
          <RouteBox
            map={mapRef.current}
            googleKey={GOOGLE_API_KEY}
            maptilerKey={MAPTILER_KEY}
            onRoutes={onRoutes}
            onResetRoutes={resetRoutes}
          />

          <WeatherBox map={mapRef.current} googleKey={GOOGLE_API_KEY} />

          {showRoadRisk && <RoadsLayer map={mapRef.current} />}

          {showHex && (
            <HexRiskLayer map={mapRef.current} enabled cellMeters={500} opacity={0.12} extentScale={1} clipToMask={false} />
          )}

          {showGlow && (
            <HeatmapRiskLayer map={mapRef.current} enabled radiusPx={cityGlowRadius} />
          )}

          {gradientRoutes.length > 0 && (
            <MultiRouteGradientLayer map={mapRef.current} routes={gradientRoutes} />
          )}

          <ConfigBox onOpenSidebar={() => setSidebarOpen(true)} />

          <Sidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            showHex={showHex}
            onToggleHex={setShowHex}
            showGlow={showGlow}
            onToggleGlow={setShowGlow}
            showRoadRisk={showRoadRisk}
            onToggleRoadRisk={setShowRoadRisk}
            showTraffic={showTraffic}
            onToggleTraffic={setShowTraffic}
            cityGlowRadius={cityGlowRadius}
            onCityGlowRadiusChange={setCityGlowRadius}
            viewMode={viewMode}
            selectType={selectType}
            onModeChange={(mode) => setViewMode(mode)}
            onSelectTypeChange={(mode) => setSelectType(mode)}
          />

          {showTraffic && (
            <HereTrafficLayer
              map={mapRef.current}
              apiKey={HERE_API_KEY}
              lat={mapCenter.lat}
              lon={mapCenter.lng}
              radius={Math.max(3000, 5000 / Math.max(1, mapZoom))}
            />
          )}
        </>
      )}
    </div>
  );
};

export default AcciNetMap;

async function loadMapStyle() {
  const styleURL = `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_KEY}`;
  const response = await fetch(styleURL);
  if (!response.ok) {
    throw new Error(`Failed to fetch MapTiler style (${response.status})`);
  }
  const style = await response.json();
  return style;
}

function simulateProbs(coords: [number, number][]): number[] {
  if (!coords.length) return [];
  const segments = Math.max(10, Math.round(coords.length / 50));
  return Array.from({ length: segments }, (_, i) => 0.2 + 0.6 * (i / Math.max(1, segments - 1)));
}

function normalizeCoords(coords: [number, number][]): [number, number][] {
  if (!coords.length) return coords;
  const [firstLng, firstLat] = coords[0];
  const looksLatLng = Math.abs(firstLng) <= 90 && Math.abs(firstLat) > 90;
  return looksLatLng ? coords.map(([lat, lng]) => [lng, lat]) : coords;
}

function indexOfMin(values: number[]): number {
  if (!values.length) return -1;
  return values.reduce((best, value, idx, arr) => (value < arr[best] ? idx : best), 0);
}

function estimateDistanceMeters(coords: [number, number][]): number {
  if (coords.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < coords.length; i += 1) {
    const [lng1, lat1] = coords[i - 1];
    const [lng2, lat2] = coords[i];
    total += haversineMeters(lat1, lng1, lat2, lng2);
  }
  return total;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
