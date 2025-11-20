'use client';

import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';

type Props = {
  map: maplibregl.Map | undefined;
  apiKey: string;
  enabled?: boolean;
  style?: 'absolute' | 'relative' | 'relative-delay' | 'reduced-sensitivity';
};

export default function TomTomTrafficLayer({
  map,
  apiKey,
  enabled = true,
  style = 'reduced-sensitivity', // Less sensitive to minor slowdowns, more subtle
}: Props) {
  useEffect(() => {
    if (!map || !enabled) {
      // Clean up if disabled
      const sourceId = 'tomtom-traffic-flow';
      const layerId = 'tomtom-traffic-flow-layer';
      if (map) {
        try {
          if (map.getLayer(layerId)) {
            map.removeLayer(layerId);
          }
          if (map.getSource(sourceId)) {
            map.removeSource(sourceId);
          }
        } catch (e) {
          console.warn('Error removing TomTom layer:', e);
        }
      }
      return;
    }

    if (!apiKey) {
      console.warn('TomTom API key is missing. Please set NEXT_PUBLIC_TOM_TOM_KEY in your environment variables.');
      return;
    }

    const sourceId = 'tomtom-traffic-flow';
    const layerId = 'tomtom-traffic-flow-layer';

    const addLayer = () => {
      if (!map.isStyleLoaded()) {
        console.log('TomTom: Map style not loaded yet, waiting...');
        return;
      }

      try {
        // Remove existing layer/source if they exist
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }

        const tileUrl = `https://api.tomtom.com/traffic/map/4/tile/flow/${style}/{z}/{x}/{y}.png?key=${apiKey}`;
        console.log('TomTom: Adding traffic layer with URL:', tileUrl.replace(apiKey, '***'));

        // Add raster tile source for traffic flow
        map.addSource(sourceId, {
          type: 'raster',
          tiles: [tileUrl],
          tileSize: 256,
          attribution: '© 1992-2025 TomTom',
        });

        // Add the layer on top of everything - more solid lines with enhanced heavy/severe visibility
        map.addLayer({
          id: layerId,
          type: 'raster',
          source: sourceId,
          paint: {
            'raster-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              8, 0.5,   // More solid at lower zoom
              10, 0.6,  // More visible
              12, 0.7,  // Very visible when zoomed in
              14, 0.75, // Maximum visibility at high zoom
            ],
            'raster-brightness-min': 0.5,  // Keep brightness up for visibility
            'raster-brightness-max': 1.0,   // Full brightness
            'raster-saturation': 0.3,       // Increase saturation to make heavy/severe (red/orange) more vivid
            'raster-contrast': 0.4,         // Increase contrast to make severity differences more pronounced
            'raster-hue-rotate': 0,         // Keep original colors
          },
          minzoom: 8,  // Only show at city/street level, not when zoomed out
          maxzoom: 22,
        });

        console.log('TomTom: Traffic layer added successfully');
        
        // Verify the layer was added
        if (map.getLayer(layerId)) {
          console.log('TomTom: Layer verified in map');
        } else {
          console.error('TomTom: Layer was not added to map');
        }
      } catch (error) {
        console.error('TomTom: Error adding traffic layer:', error);
      }
    };

    // Wait for map to be loaded
    if (map.isStyleLoaded()) {
      addLayer();
    } else {
      const onLoad = () => {
        console.log('TomTom: Map loaded, adding layer');
        addLayer();
      };
      map.once('load', onLoad);
      map.once('styledata', onLoad);
    }

    return () => {
      try {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      } catch (e) {
        console.warn('Error cleaning up TomTom layer:', e);
      }
    };
  }, [map, apiKey, enabled, style]);

  return null;
}

