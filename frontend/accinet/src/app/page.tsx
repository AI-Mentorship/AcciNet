"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

export default function Home() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [isDark, setIsDark] = useState(
    typeof window !== "undefined" &&
    (window.matchMedia("(prefers-color-scheme: dark)").matches ||
      document.documentElement.classList.contains("dark"))
  );

  useEffect(() => {
    let map: any;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet.heat");

      if (!mapRef.current) return;

      // Initialize map
      map = L.map(mapRef.current).setView([32.994, -96.756], 11);

      // 🗺️ Dynamic tile URL based on dark mode
      const tileUrl = isDark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

      L.tileLayer(tileUrl, {
        attribution:
          "&copy; <a href='https://openstreetmap.org'>OpenStreetMap</a> contributors",
      }).addTo(map);

      // 🌡️ Random heatmap points
      const baseLat = 32.994;
      const baseLng = -96.756;

      const basePoints = Array.from({ length: 600 }, () => [
        baseLat + (Math.random() - 0.5) * 0.36,
        baseLng + (Math.random() - 0.5) * 0.36,
        0.2 + Math.random() * 0.5,
      ]);

      const hotClusters = Array.from({ length: 6 }, () => [
        baseLat + (Math.random() - 0.5) * 0.30,
        baseLng + (Math.random() - 0.5) * 0.30,
      ]);

      const hotPoints = hotClusters.flatMap(([lat, lng]) =>
        Array.from({ length: 70 }, () => [
          lat + (Math.random() - 0.5) * 0.01,
          lng + (Math.random() - 0.5) * 0.01,
          1.0 + Math.random() * 0.8,
        ])
      );

      const allPoints = [...basePoints, ...hotPoints];

      (L as any).heatLayer(allPoints, {
        radius: 30,
        blur: 20,
        maxZoom: 12,
        max: 2.5,
        gradient: {
          0.1: "blue",
          0.3: "lime",
          0.5: "yellow",
          0.7: "orange",
          0.9: "red",
          1.0: "darkred",
        },
      }).addTo(map);
    })();

    return () => {
      if (map) map.remove();
    };
  }, [isDark]); // 🔄 re-render when theme changes

  // 🌗 Simple toggle button
  return (
    <div className="relative h-screen w-full">
      <button
        onClick={() => {
          document.documentElement.classList.toggle("dark");
          setIsDark((prev) => !prev);
        }}
        className="absolute top-4 right-4 z-[1000] bg-gray-800 text-white px-3 py-1 rounded-lg"
      >
        Toggle Dark Mode
      </button>
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
}
