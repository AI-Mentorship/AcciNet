'use client';

import { useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import RouteGradientLayer from './RouteGradientLayer';

type RouteData = {
  id: string;
  coords: [number, number][];
  probs: number[];
  theme?: 'safe' | 'moderate' | 'risky';
  conditions?: Array<any>;
};

type FullRouteInfo = {
  id: string;
  name: string;
  avgRisk: number;
  durationSec: number;
  distanceMeters: number;
};

type Props = {
  map: maplibregl.Map;
  routes: RouteData[];
  onRouteClick?: (e: maplibregl.MapLayerMouseEvent, routeId: string) => void;
  placementPoints: [number, number][];
  fullRoutesData : FullRouteInfo[];
};

export default function MultiRouteGradientLayer({ map, routes, onRouteClick, placementPoints, fullRoutesData }: Props) {
  const bestRouteId = useMemo(() => {
    if (!routes.length) return null;

    const means = routes.map((r) =>
      r.probs.length ? r.probs.reduce((a, b) => a + b, 0) / r.probs.length : 1
    );
    const idx = means.indexOf(Math.min(...means));
    return routes[idx]?.id ?? null;
  }, [routes]);

  return (
    <>
      {routes.map((r, index) => (
        <RouteGradientLayer
          key={r.id}
          map={map}
          routeCoords={r.coords}
          probs={r.probs}
          idBase={r.id}
          highlight={r.id === bestRouteId}
          theme={r.theme}
          onClick={onRouteClick ? (e) => onRouteClick(e, r.id) : undefined}
          placementPoint={placementPoints[index]}
          fullRouteData = {fullRoutesData[index]}
        />
      ))}
    </>
  );
}


