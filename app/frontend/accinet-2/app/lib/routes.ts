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
  values?: number[]; // Risk values (mocked, optional)
  conditions?: Array<any>; // Condition data (mocked, optional)
};

export async function fetchRoutesGoogle(
  origin: LatLng,
  destination: LatLng,
  _key: string
): Promise<GoogleRoute[]> {
  // Format coordinates as "lat,lng" strings
  const originStr = `${origin.lat},${origin.lng}`;
  const destStr = `${destination.lat},${destination.lng}`;
  
  console.log(`[fetchRoutesGoogle] Calling API with:`, {
    origin: originStr,
    destination: destStr,
    mode: 'driving'
  });
  
  // Call our internal Next.js API route instead of calling Google Maps directly
  const params = new URLSearchParams({
    origin: originStr,
    destination: destStr,
    mode: 'driving',
  });
  
  const res = await fetch(`/api/routes?${params.toString()}`);
  
  if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Server returned status ${res.status}`);
  }
  
  const routesData = await res.json();
  
  if (!routesData || routesData.length === 0) {
    throw new Error('No routes returned');
  }
  
  console.log(`[fetchRoutesGoogle] Internal API returned ${routesData.length} route(s)`);
  
  // Convert internal API format to GoogleRoute format expected by frontend components
  const routes = routesData
    .map((route: any, idx: number) => {
      const encodedPolyline = route.polyline;
      console.log(`[fetchRoutesGoogle] Processing route ${idx + 1}:`, {
        hasPolyline: !!encodedPolyline,
        polylineLength: encodedPolyline?.length,
        hasDuration: !!route.durationValue,
        hasDistance: !!route.distanceValue,
      });
      
      const coords = polyline.decode(encodedPolyline) as [number, number][];
      
      if (!coords || coords.length < 2) {
        console.warn(`[fetchRoutesGoogle] Route ${idx + 1}: Invalid polyline, skipping route (coords.length=${coords?.length})`);
        return null;
      }
      
      console.log(`[fetchRoutesGoogle] Route ${idx + 1}: Valid with ${coords.length} coordinates`);
      
      // Extract duration and distance 
      // Note: route.durationValue and route.distanceValue are added in the API route
      // If not available, fallback to parsing string or 0
      const durationSec = route.durationValue || 0;
      const distanceMeters = route.distanceValue || 0;
      
      return {
        coords,
        durationSec,
        distanceMeters,
        values: route.values,
        conditions: route.conditions,
      };
    })
    .filter((r: any) => r !== null && Array.isArray(r.coords) && r.coords.length > 1) as Array<{
      coords: [number, number][];
      durationSec: number;
      distanceMeters: number;
      values?: number[];
      conditions?: Array<any>;
    }>;
  
  console.log(`[fetchRoutesGoogle] After processing: ${routes.length} valid route(s)`);
  return routes;
}
