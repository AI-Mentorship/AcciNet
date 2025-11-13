'use client';

import { useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import RouteGradientLayer from './RouteGradientLayer';

type RouteData = {
  id: string;
  coords: [number, number][];
  probs: number[];
  theme?: 'safe' | 'moderate' | 'risky';
};

type Props = {
  map: maplibregl.Map;
  routes: RouteData[];
};

export default function MultiRouteGradientLayer({ map, routes }: Props) {
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
      {routes.map((r) => (
        <RouteGradientLayer
          key={r.id}
          map={map}
          routeCoords={r.coords}
          probs={r.probs}
          idBase={r.id}
          highlight={r.id === bestRouteId}
          theme={r.theme}
        />
      ))}
    </>
  );
}


