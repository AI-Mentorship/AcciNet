"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import useTheme from "./hooks/useTheme";
import SearchBox from "./components/SearchBox";
import useCurrentLocation from "./hooks/getLocation";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { RouteParameters, RouteDetails, getRoute } from "./lib/route";
import polyline from "@mapbox/polyline";

// --- Fix Leaflet marker icons for Next.js / Vite ---
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x.src ?? markerIcon2x,
  iconUrl: markerIcon.src ?? markerIcon,
  shadowUrl: markerShadow.src ?? markerShadow,
});

export default function Page() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLayersRef = useRef<L.Polyline[]>([]);

  const searchDivRef = useRef<HTMLDivElement | null>(null);
  const [, forceRender] = useState(0);

  const { isDark } = useTheme();
  const { location } = useCurrentLocation();

  // 🧭 Handle route search and drawing
  const handleRouteSearch = async (originAddress: string, destinationAddress: string) => {
    if (!originAddress || !destinationAddress) {
      console.error("Missing origin or destination for route");
      return;
    }

    const params: RouteParameters = {
      origin: originAddress,
      destination: destinationAddress,
      mode: "driving",
    };

    try {
      const results: RouteDetails[] = await getRoute(params);
      const map = mapRef.current;
      if (!map) return;

      //  Clear existing routes
      routeLayersRef.current.forEach(layer => map.removeLayer(layer));
      routeLayersRef.current = [];

      if (!results.length) {
        console.warn("No routes found.");
        return;
      }

      let allBounds: L.LatLngBounds | undefined;
      const colors = ["#0070FF", "#FF5733", "#33FF57"]; // blue, orange, green

      //  Loop through all routes and render each
      results.forEach((routeDetails, index) => {
        console.log(`Rendering route ${index + 1}: ${routeDetails.summary}`);

        // Decode polyline into coordinate pairs
        const coords = polyline.decode(routeDetails.polyline) as [number, number][];
        const offset = (index - 1) * 0.0003; // small visual offset (~30m)
        const latlngs = coords.map(([lat, lng]) => [lat + offset, lng]);

        // Style per route
        const styleOptions: L.PolylineOptions = {
          color: colors[index % colors.length],
          weight: index === 0 ? 6 : 4,
          opacity: 0.9,
          dashArray: index === 0 ? undefined : "6, 6",
        };

        // Draw polyline
        const routeLine = L.polyline(latlngs, styleOptions).addTo(map);
        routeLayersRef.current.push(routeLine);

        const routeBounds = routeLine.getBounds();
        allBounds = allBounds ? allBounds.extend(routeBounds) : routeBounds;
      });

      //  Fit all routes into view
      if (allBounds) map.fitBounds(allBounds, { padding: [24, 24] });
    } catch (err) {
      console.error("Error fetching route:", err);
    }
  };

  //  Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([32.99, -96.75], 13);

    // Use default OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    
    mapRef.current = map;

    // Search + Theme controls
    const SearchControl = L.Control.extend({
      options: { position: "topleft" as L.ControlPosition },
      onAdd() {
        const container = L.DomUtil.create("div", "leaflet-control leaflet-control-custom");
        L.DomEvent.disableClickPropagation(container);
        searchDivRef.current = container;
        forceRender(x => x + 1);
        return container;
      },
      onRemove() {
        searchDivRef.current = null;
        forceRender(x => x + 1);
      },
    });

    const searchCtrl = new SearchControl();
    searchCtrl.addTo(map);

    return () => {
      searchCtrl.remove();
      map.remove();
      mapRef.current = null;
      searchDivRef.current = null;
    };
  }, []);

  //  Apply modern, sleek CSS filters for map tiles
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const tilePane = map.getPanes().tilePane as HTMLDivElement | undefined;
    if (!tilePane) return;

    // Modern, sleek styling with enhanced filters
    if (isDark) {
      // Dark mode: softer, eye-friendly inversion with reduced brightness and contrast
      tilePane.style.filter = 
        "invert(90%) hue-rotate(180deg) brightness(0.7) contrast(0.95) saturate(1.1)";
    } else {
      // Light mode: enhanced saturation, contrast, and subtle sharpening for modern look
      tilePane.style.filter = 
        "brightness(1.05) contrast(1.08) saturate(1.15)";
    }
  }, [isDark]);

  //  Add current location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location) return;

    const marker = L.marker([location.lat, location.lng]).addTo(map);
    map.flyTo([location.lat, location.lng], 14, { duration: 1.5 });

    return () => {
      map.removeLayer(marker);
    };
  }, [location]);

  //  Render map + portals
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div className="flex-1 relative">
        <div ref={mapContainerRef} className="absolute inset-0" />
        {searchDivRef.current &&
          createPortal(<SearchBox onSearch={handleRouteSearch} />, searchDivRef.current)}
      </div>
    </div>
  );
}
