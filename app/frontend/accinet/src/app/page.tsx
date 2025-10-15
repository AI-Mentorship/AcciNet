"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export default function Home() {
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let map: any;

    (async () => {
      const L = (await import("leaflet")).default;
      if (!mapRef.current) return;

      map = L.map(mapRef.current).setView([32.994, -96.756], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
      }).addTo(map);
    })();

    return () => {
      if (map) map.remove();
    };
  }, []);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}