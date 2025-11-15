// routes.ts
import polyline from '@mapbox/polyline';

export type LatLng = { lat: number; lng: number };

export async function geocodeAddress(
  q: string,
  key: string
): Promise<LatLng | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${encodeURIComponent(key)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`geocoder HTTP ${r.status}`);
  const data = await r.json();
  const hit = data.results?.[0]?.geometry?.location || null;
  return hit ? { lat: hit.lat, lng: hit.lng } : null;
}

export async function getCurrentLocation(timeoutMs = 8000): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(new Error('geolocation unsupported'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}

// Minimal duration parser: "123.45s" -> 123.45
export function parseDurationSec(d?: string): number {
  if (!d) return 0;
  return parseFloat(String(d).replace(/s$/, '')) || 0;
}

export type GoogleRoute = {
  coords: [number, number][];
  durationSec: number;
  distanceMeters: number;
  values?: number[]; // Risk values from backend (optional)
  conditions?: Array<any>; // Condition data from backend (optional)
};

export async function fetchRoutesGoogle(
  origin: LatLng,
  destination: LatLng,
  _key: string
): Promise<GoogleRoute[]> {
  // Call the backend directly instead of Next.js API route
  const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://127.0.0.1:8000';
  
  // Backend expects origin and destination as address strings or coordinates
  // Format coordinates as "lat,lng" strings
  const originStr = `${origin.lat},${origin.lng}`;
  const destStr = `${destination.lat},${destination.lng}`;
  
  const params = new URLSearchParams({
    origin: originStr,
    destination: destStr,
    mode: 'driving',
  });
  
  const res = await fetch(`${BACKEND_BASE}/routes?${params.toString()}`);
  if (!res.ok) throw new Error(`routes HTTP ${res.status}`);
  
  const data = (await res.json()) as Array<{
    polyline: string;
    distance: string;
    duration: string;
    summary: string;
    values?: number[]; // Risk values from backend
    conditions?: Array<{
      lat: number;
      lon: number;
      weathercode?: number;
      temperature?: number;
      road_type?: string;
      road_name?: string;
    }>;
  }>;
  
  console.log(`[fetchRoutesGoogle] Backend returned ${Array.isArray(data) ? data.length : 0} route(s)`);
  
  if (!Array.isArray(data) || !data.length)
    throw new Error('No routes returned');
  
  // Convert backend RouteDetails format to GoogleRoute format
  // Need to decode polyline and parse distance/duration
  const routes = data
    .map((route) => {
      const coords = polyline.decode(route.polyline) as [number, number][];
      if (!coords || coords.length < 2) {
        console.warn('[fetchRoutesGoogle] Invalid polyline, skipping route');
        return null;
      }
      
      // Parse duration (e.g., "12 mins" -> seconds)
      const durationMatch = route.duration.match(/(\d+(?:\.\d+)?)\s*(min|mins|hour|hours|hr|hrs)/i);
      const durationValue = durationMatch ? parseFloat(durationMatch[1]) : 0;
      const durationUnit = durationMatch?.[2]?.toLowerCase() || 'min';
      const durationSec = durationUnit.includes('hour') || durationUnit.includes('hr')
        ? durationValue * 3600
        : durationValue * 60;
      
      // Parse distance (e.g., "5.2 mi" -> meters)
      const distanceMatch = route.distance.match(/(\d+(?:\.\d+)?)\s*(mi|mile|miles|km|kilometer|kilometers)/i);
      const distanceValue = distanceMatch ? parseFloat(distanceMatch[1]) : 0;
      const distanceUnit = distanceMatch?.[2]?.toLowerCase() || 'mi';
      const distanceMeters = distanceUnit.includes('km') || distanceUnit.includes('kilometer')
        ? distanceValue * 1000
        : distanceValue * 1609.34; // miles to meters
      
      return {
        coords,
        durationSec,
        distanceMeters,
        // Store backend values and conditions for use in frontend
        values: route.values,
        conditions: route.conditions,
      };
    })
    .filter((r) => r !== null && Array.isArray(r.coords) && r.coords.length > 1) as Array<{
      coords: [number, number][];
      durationSec: number;
      distanceMeters: number;
      values?: number[];
      conditions?: Array<any>;
    }>;
  
  console.log(`[fetchRoutesGoogle] After processing: ${routes.length} valid route(s)`);
  return routes;
}


