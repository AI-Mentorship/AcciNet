"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import useTheme from "./hooks/useTheme";
import ThemeButton from "./components/ThemeButton";

// ---- Tile URLs & attributions ----
const TILE_URLS = {
  light: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
};
const ATTRIBUTIONS = {
  light:
    "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
  dark:
    "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors &copy; <a href='https://carto.com/attributions'>CARTO</a>",
};

export default function Page() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Container for our Leaflet control so we can portal the React button into it
  const controlDivRef = useRef<HTMLDivElement | null>(null);
  const [, forceRender] = useState(0);

  const { isDark } = useTheme();

  // 1) Init map and create a control container once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([32.99, -96.75], 13);

    mapRef.current = map;

    const ThemeToggleControl = L.Control.extend({
      options: { position: "topright" as L.ControlPosition },
      onAdd() {
        const container = L.DomUtil.create(
          "div",
          "leaflet-bar leaflet-control bg-white p-2 rounded-md shadow-lg"
        );
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);
        controlDivRef.current = container;
        // kick a render so the portal mounts
        forceRender((x) => x + 1);
        return container;
      },
      onRemove() {
        controlDivRef.current = null;
        forceRender((x) => x + 1);
      },
    });

    const ctrl = new ThemeToggleControl();
    ctrl.addTo(map);

    return () => {
      ctrl.remove();
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      controlDivRef.current = null;
    };
  }, []);

  // 2) Swap base layer whenever theme changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const url = isDark ? TILE_URLS.dark : TILE_URLS.light;
    const attribution = isDark ? ATTRIBUTIONS.dark : ATTRIBUTIONS.light;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    const layer = L.tileLayer(url, { maxZoom: 19, attribution });
    layer.addTo(map);
    tileLayerRef.current = layer;
  }, [isDark]);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <div ref={mapContainerRef} className="absolute inset-0" />
      {/* When the Leaflet control div exists, portal the React button into it */}
      {controlDivRef.current
        ? createPortal(<ThemeButton />, controlDivRef.current)
        : null}
    </div>
  );
}
