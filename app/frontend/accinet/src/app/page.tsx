"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import useTheme from "./hooks/useTheme";
<<<<<<< HEAD
import ThemeButton from "./components/ThemeButton";
=======
>>>>>>> 9d6a451d13211a74de66aeda9c0c76c3f34897e0
import SearchBox from "./components/SearchBox";
import useCurrentLocation from "./hooks/getLocation";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { RouteParameters, RouteDetails, getRoute } from "./lib/route";
import polyline from "@mapbox/polyline";

<<<<<<< HEAD

=======
// --- Fix Leaflet marker icons for Next.js / Vite ---
>>>>>>> 9d6a451d13211a74de66aeda9c0c76c3f34897e0
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x.src ?? markerIcon2x,
  iconUrl: markerIcon.src ?? markerIcon,
  shadowUrl: markerShadow.src ?? markerShadow,
});

<<<<<<< HEAD
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors";

export default function Page() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  const searchDivRef = useRef<HTMLDivElement | null>(null);
  const controlDivRef = useRef<HTMLDivElement | null>(null);
=======
export default function Page() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLayersRef = useRef<L.Polyline[]>([]);

  const searchDivRef = useRef<HTMLDivElement | null>(null);
>>>>>>> 9d6a451d13211a74de66aeda9c0c76c3f34897e0
  const [, forceRender] = useState(0);

  const { isDark } = useTheme();
  const { location } = useCurrentLocation();

<<<<<<< HEAD
  // 🔹 Keep origin string EXACTLY "lat,lng"
  const handleRouteSearch = async (destinationAddress: string) => {
    if (!location || !destinationAddress) {
=======
  // 🧭 Handle route search and drawing
  const handleRouteSearch = async (originAddress: string, destinationAddress: string) => {
    if (!originAddress || !destinationAddress) {
>>>>>>> 9d6a451d13211a74de66aeda9c0c76c3f34897e0
      console.error("Missing origin or destination for route");
      return;
    }

    const params: RouteParameters = {
<<<<<<< HEAD
      origin: `${location.lat},${location.lng}`, // ← preserved string format
      destination: destinationAddress,           // already a string
=======
      origin: originAddress,
      destination: destinationAddress,
>>>>>>> 9d6a451d13211a74de66aeda9c0c76c3f34897e0
      mode: "driving",
    };

    try {
<<<<<<< HEAD
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
=======
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
>>>>>>> 9d6a451d13211a74de66aeda9c0c76c3f34897e0
    } catch (err) {
      console.error("Error fetching route:", err);
    }
  };

<<<<<<< HEAD
=======
  //  Initialize map once
>>>>>>> 9d6a451d13211a74de66aeda9c0c76c3f34897e0
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([32.99, -96.75], 13);

<<<<<<< HEAD
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
    mapRef.current = map;

=======
    // Use default OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    
    mapRef.current = map;

    // Search + Theme controls
>>>>>>> 9d6a451d13211a74de66aeda9c0c76c3f34897e0
    const SearchControl = L.Control.extend({
      options: { position: "topleft" as L.ControlPosition },
      onAdd() {
        const container = L.DomUtil.create("div", "leaflet-control leaflet-control-custom");
        L.DomEvent.disableClickPropagation(container);
        searchDivRef.current = container;
<<<<<<< HEAD
        forceRender((x) => x + 1);
=======
        forceRender(x => x + 1);
>>>>>>> 9d6a451d13211a74de66aeda9c0c76c3f34897e0
        return container;
      },
      onRemove() {
        searchDivRef.current = null;
<<<<<<< HEAD
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
=======
        forceRender(x => x + 1);
      },
    });

    const searchCtrl = new SearchControl();
>>>>>>> 9d6a451d13211a74de66aeda9c0c76c3f34897e0
    searchCtrl.addTo(map);

    return () => {
      searchCtrl.remove();
<<<<<<< HEAD
      toggleCtrl.remove();
      map.remove();
      mapRef.current = null;
      controlDivRef.current = null;
=======
      map.remove();
      mapRef.current = null;
>>>>>>> 9d6a451d13211a74de66aeda9c0c76c3f34897e0
      searchDivRef.current = null;
    };
  }, []);

<<<<<<< HEAD
=======
  //  Apply modern, sleek CSS filters for map tiles
>>>>>>> 9d6a451d13211a74de66aeda9c0c76c3f34897e0
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const tilePane = map.getPanes().tilePane as HTMLDivElement | undefined;
    if (!tilePane) return;

<<<<<<< HEAD
    tilePane.style.filter = isDark
      ? "invert(90%) hue-rotate(180deg) brightness(80%) contrast(90%)"
      : "none";
  }, [isDark]);

=======
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
>>>>>>> 9d6a451d13211a74de66aeda9c0c76c3f34897e0
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location) return;

    const marker = L.marker([location.lat, location.lng]).addTo(map);
    map.flyTo([location.lat, location.lng], 14, { duration: 1.5 });

    return () => {
      map.removeLayer(marker);
    };
  }, [location]);

<<<<<<< HEAD
=======
  //  Render map + portals
>>>>>>> 9d6a451d13211a74de66aeda9c0c76c3f34897e0
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div className="flex-1 relative">
        <div ref={mapContainerRef} className="absolute inset-0" />
<<<<<<< HEAD
        {controlDivRef.current && createPortal(<ThemeButton />, controlDivRef.current)}
=======
>>>>>>> 9d6a451d13211a74de66aeda9c0c76c3f34897e0
        {searchDivRef.current &&
          createPortal(<SearchBox onSearch={handleRouteSearch} />, searchDivRef.current)}
      </div>
    </div>
  );
}
