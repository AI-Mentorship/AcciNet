// src/hooks/useCurrentLocation.ts
"use client";
import { useEffect, useState } from "react";

export default function useCurrentLocation() {
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!navigator.geolocation) {
            setError("Geolocation not supported by browser");
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                console.log("Geolocation position:", pos);
                const { latitude, longitude } = pos.coords;
                setLocation({ lat: latitude, lng: longitude });
                setLoading(false);
            },
            (err) => {
                setError(err.message);
                setLoading(false);
            },
            { enableHighAccuracy: true }
        );
    }, []);

    return { location, error, loading };
}
