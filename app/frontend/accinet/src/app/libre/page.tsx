"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import useTheme from "../hooks/useTheme";

export default function LibrePage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const { isDark } = useTheme();

  // Initialize WebGL map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create map with WebGL rendering
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          "osm-tiles": {
            type: "raster",
            tiles: [
              "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxzoom: 19,
          },
        },
        layers: [
          {
            id: "osm-tiles-layer",
            type: "raster",
            source: "osm-tiles",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
      },
      center: [-96.75, 32.99], // Same as default map: [lng, lat]
      zoom: 13,
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    // Add fullscreen control
    map.addControl(new maplibregl.FullscreenControl(), "top-right");

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Apply dark mode styling
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Apply CSS filters for dark mode similar to the main page
    const canvas = map.getCanvasContainer();
    if (canvas) {
      if (isDark) {
        canvas.style.filter =
          "invert(90%) hue-rotate(180deg) brightness(0.7) contrast(0.95) saturate(1.1)";
      } else {
        canvas.style.filter =
          "brightness(1.05) contrast(1.08) saturate(1.15)";
      }
    }
  }, [isDark]);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div className="flex-1 relative">
        <div ref={mapContainerRef} className="absolute inset-0" />
      </div>
    </div>
  );
}
