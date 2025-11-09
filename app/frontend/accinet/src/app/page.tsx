"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import useTheme from "./hooks/useTheme";
import ThemeButton from "./components/ThemeButton";
import SearchBox from "./components/SearchBox";
import useCurrentLocation from "./hooks/getLocation";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { RouteParameters, RouteDetails, getRoute } from "./lib/route";
import polyline from "@mapbox/polyline";


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
  const routeLayerRef = useRef<L.Polyline | null>(null);

  const searchDivRef = useRef<HTMLDivElement | null>(null);
  const controlDivRef = useRef<HTMLDivElement | null>(null);
  const [, forceRender] = useState(0);

  const { isDark } = useTheme();
  const { location } = useCurrentLocation();

  // 🔹 Keep origin string EXACTLY "lat,lng"
  const handleRouteSearch = async (destinationAddress: string) => {
    if (!location || !destinationAddress) {
      console.error("Missing origin or destination for route");
      return;
    }

    const params: RouteParameters = {
      origin: `${location.lat},${location.lng}`, // ← preserved string format
      destination: destinationAddress,           // already a string
      mode: "driving",
    };

    try {
      const result: RouteDetails = await getRoute(params);

      const coords = polyline.decode(result.polyline) as [number, number][];
      const latlngs: [number, number][] = coords.map(([lat, lng]: [number, number]) => [lat, lng]);


      const map = mapRef.current;
      if (!map) return;

      if (routeLayerRef.current) {
        map.removeLayer(routeLayerRef.current);
      }

      const routeLine = L.polyline(latlngs, { weight: 5, opacity: 0.8 }).addTo(map);
      routeLayerRef.current = routeLine;

      map.fitBounds(routeLine.getBounds(), { padding: [24, 24] });
    } catch (err) {
      console.error("Error fetching route:", err);
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([32.99, -96.75], 13);

    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
    mapRef.current = map;

    const SearchControl = L.Control.extend({
      options: { position: "topleft" as L.ControlPosition },
      onAdd() {
        const container = L.DomUtil.create("div", "leaflet-control leaflet-control-custom");
        L.DomEvent.disableClickPropagation(container);
        searchDivRef.current = container;
        forceRender((x) => x + 1);
        return container;
      },
      onRemove() {
        searchDivRef.current = null;
        forceRender((x) => x + 1);
      },
    });

    const ThemeToggleControl = L.Control.extend({
      options: { position: "bottomright" as L.ControlPosition },
      onAdd() {
        const container = L.DomUtil.create("div", "leaflet-control leaflet-control-custom");
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

    const toggleCtrl = new ThemeToggleControl();
    const searchCtrl = new SearchControl();
    toggleCtrl.addTo(map);
    searchCtrl.addTo(map);

    return () => {
      searchCtrl.remove();
      toggleCtrl.remove();
      map.remove();
      mapRef.current = null;
      controlDivRef.current = null;
      searchDivRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const tilePane = map.getPanes().tilePane as HTMLDivElement | undefined;
    if (!tilePane) return;

    tilePane.style.filter = isDark
      ? "invert(90%) hue-rotate(180deg) brightness(80%) contrast(90%)"
      : "none";
  }, [isDark]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location) return;

    const marker = L.marker([location.lat, location.lng]).addTo(map);
    map.flyTo([location.lat, location.lng], 14, { duration: 1.5 });

    return () => {
      map.removeLayer(marker);
    };
  }, [location]);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div className="flex-1 relative">
        <div ref={mapContainerRef} className="absolute inset-0" />
        {controlDivRef.current && createPortal(<ThemeButton />, controlDivRef.current)}
        {searchDivRef.current &&
          createPortal(<SearchBox onSearch={handleRouteSearch} />, searchDivRef.current)}
      </div>
    </div>
  );
}
