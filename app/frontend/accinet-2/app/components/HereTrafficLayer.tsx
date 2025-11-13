'use client';

import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';

type Props = {
  map: maplibregl.Map;
  apiKey: string;
  lat: number;
  lon: number;
  radius?: number;
};

export default function HereTrafficLayer({ map, apiKey: _unusedApiKey, lat, lon, radius = 4000 }: Props) {
  useEffect(() => {
    // Placeholder implementation - can be enhanced later with HERE API
    // For now, just ensure the component doesn't break
  }, [map, lat, lon, radius]);

  return null;
}


