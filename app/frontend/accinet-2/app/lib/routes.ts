// routes.ts
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
};

export async function fetchRoutesGoogle(
  origin: LatLng,
  destination: LatLng,
  _key: string
): Promise<GoogleRoute[]> {
  const res = await fetch('/api/routes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin, destination }),
  });
  if (!res.ok) throw new Error(`routes HTTP ${res.status}`);
  const data = (await res.json()) as GoogleRoute[];
  if (!Array.isArray(data) || !data.length)
    throw new Error('No routes returned');
  return data
    .map((route) => ({
      coords: route.coords,
      durationSec: route.durationSec,
      distanceMeters: route.distanceMeters,
    }))
    .filter((r) => Array.isArray(r.coords) && r.coords.length > 1);
}


