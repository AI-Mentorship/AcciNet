"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import useTheme from "./hooks/useTheme";
import ThemeButton from "./components/ThemeButton";
import SearchBox from "./components/SearchBox";
import useCurrentLocation from "./hooks/getLocation";
import { MapPin } from 'lucide-react';
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix for missing default marker icons in Next.js/Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x.src ?? markerIcon2x,
  iconUrl: markerIcon.src ?? markerIcon,
  shadowUrl: markerShadow.src ?? markerShadow,
});

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors";

export default function Page() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const controlDivRef = useRef<HTMLDivElement | null>(null);
  const [, forceRender] = useState(0);

  const { isDark } = useTheme();
  const { location, error, loading } = useCurrentLocation(); // custom hook

  // 1) Initialize map and controls
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([32.99, -96.75], 13);

    const base = L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION });
    base.addTo(map);

    mapRef.current = map;
    tileLayerRef.current = base;

    // Add control container for the theme button
    const ThemeToggleControl = L.Control.extend({
      options: { position: "topright" as L.ControlPosition },
      onAdd() {
        const container = L.DomUtil.create(
          "div",
          "leaflet-bar leaflet-control leaflet-control-custom"
        );
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);
        controlDivRef.current = container;
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

  // 2) Apply/remove dark mode filter
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const tilePane = map.getPanes().tilePane as HTMLDivElement | undefined;
    if (!tilePane) return;

    tilePane.style.filter = isDark
      ? "invert(90%) hue-rotate(180deg) brightness(80%) contrast(90%)"
      : "none";
  }, [isDark]);

  // 3) Pan/fly to user location once determined
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location) return;

    map.flyTo([location.lat, location.lng], 14, { duration: 1.5 });

    const marker = L.marker([location.lat, location.lng]).addTo(map);

    return () => {
      map.removeLayer(marker);
    };
  }, [location]);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-white z-10 p-4 overflow-y-auto">
        <SearchBox />
        {loading && <p className="text-sm text-gray-500">Finding your location...</p>}
        {error && <p className="text-sm text-red-500">Error: {error}</p>}
      </aside>

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapContainerRef} className="absolute inset-0" />
        {controlDivRef.current
          ? createPortal(<ThemeButton />, controlDivRef.current)
          : null}
      </div>
    </div>
  );
}
