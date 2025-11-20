import { NextResponse } from 'next/server';
import polyline from '@mapbox/polyline';

// Types for Google Maps API response (simplified)
interface GoogleLeg {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
}

interface GoogleRoute {
  legs: GoogleLeg[];
  overview_polyline: { points: string };
  summary: string;
}

interface GoogleDirectionsResponse {
  routes: GoogleRoute[];
  status: string;
  error_message?: string;
}

/**
 * Generates smooth random gradient values for a route polyline.
 * Uses key points with random values and smooth interpolation between them.
 */
function generateSmoothGradientValues(polylineString: string): number[] {
  try {
    const coords = polyline.decode(polylineString) as [number, number][];
    if (coords.length === 0) return [];
    
    const numPoints = coords.length;
    
    // Generate 3-5 random key points along the route
    const numKeyPoints = Math.min(5, Math.max(3, Math.floor(numPoints / 20)));
    const keyPointIndices: number[] = [];
    const keyPointValues: number[] = [];
    
    // Always include start and end points
    keyPointIndices.push(0);
    keyPointValues.push(Math.random()); // Random start value (0-1)
    
    // Add random key points in between
    for (let i = 1; i < numKeyPoints - 1; i++) {
      const index = Math.floor((i / numKeyPoints) * numPoints);
      keyPointIndices.push(index);
      keyPointValues.push(Math.random()); // Random value (0-1)
    }
    
    // Always include end point
    keyPointIndices.push(numPoints - 1);
    keyPointValues.push(Math.random()); // Random end value (0-1)
    
    // Interpolate values for all points using smooth cubic interpolation
    const values: number[] = [];
    for (let i = 0; i < numPoints; i++) {
      // Find the two key points that bracket this index
      let lowerIdx = 0;
      let upperIdx = keyPointIndices.length - 1;
      
      for (let j = 0; j < keyPointIndices.length - 1; j++) {
        if (i >= keyPointIndices[j] && i <= keyPointIndices[j + 1]) {
          lowerIdx = j;
          upperIdx = j + 1;
          break;
        }
      }
      
      const lowerIndex = keyPointIndices[lowerIdx];
      const upperIndex = keyPointIndices[upperIdx];
      const lowerValue = keyPointValues[lowerIdx];
      const upperValue = keyPointValues[upperIdx];
      
      if (lowerIndex === upperIndex) {
        values.push(lowerValue);
      } else {
        // Smooth interpolation using ease-in-out curve
        const t = (i - lowerIndex) / (upperIndex - lowerIndex);
        // Apply smooth easing function (ease-in-out cubic)
        const easedT = t < 0.5 
          ? 4 * t * t * t 
          : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const interpolated = lowerValue + (upperValue - lowerValue) * easedT;
        values.push(Math.max(0, Math.min(1, interpolated))); // Clamp to [0, 1]
      }
    }
    
    return values;
  } catch (error) {
    console.error('Error generating gradient values:', error);
    return [];
  }
}

/**
 * Generates mocked condition data for a route polyline.
 * Samples points along the route and creates mock weather/road conditions.
 */
function generateMockConditions(polylineString: string, sampleInterval: number = 8) {
  try {
    const coords = polyline.decode(polylineString) as [number, number][];
    if (coords.length === 0) return [];
    
    const conditions = [];
    const roadTypes = ['highway', 'primary', 'secondary', 'residential', 'tertiary'];
    const roadNames = ['Main St', 'Highway 101', 'Park Ave', 'Oak Blvd', 'Elm St', 'Maple Dr'];
    
    // Sample every Nth point
    for (let i = 0; i < coords.length; i += sampleInterval) {
      const [lat, lng] = coords[i];
      
      // Generate mock weather data
      const weathercode = Math.floor(Math.random() * 10); // 0-9 weather codes
      const temperature = 20 + Math.random() * 15; // 20-35°C
      
      // Generate mock road data
      const roadType = roadTypes[Math.floor(Math.random() * roadTypes.length)];
      const roadName = roadNames[Math.floor(Math.random() * roadNames.length)];
      
      conditions.push({
        lat,
        lon: lng,
        weathercode,
        temperature: Math.round(temperature * 10) / 10,
        road_type: roadType,
        road_name: roadName,
      });
    }
    
    return conditions;
  } catch (error) {
    console.error('Error generating mock conditions:', error);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = searchParams.get('origin');
  const destination = searchParams.get('destination');
  const mode = searchParams.get('mode') || 'driving';

  if (!origin || !destination) {
    return NextResponse.json(
      { error: 'Origin and destination are required' },
      { status: 400 }
    );
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Server configuration error: Google Maps API key missing' },
      { status: 500 }
    );
  }

  try {
    // Build query string
    const params = new URLSearchParams({
      origin,
      destination,
      mode,
      key: apiKey,
      alternatives: 'true',
    });

    const apiUrl = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;
    
    console.log(`[API /routes] Requesting from Google Maps:`, {
      origin,
      destination,
      mode,
      alternatives: 'true',
      url: apiUrl.replace(apiKey, 'REDACTED')
    });
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Maps API error response:', errorText);
      throw new Error(`Google Maps API returned status ${response.status}`);
    }

    const data = (await response.json()) as GoogleDirectionsResponse;

    if (data.status !== 'OK') {
      console.error('Google Maps API status error:', data);
      throw new Error(`Google Maps API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }

    if (!data.routes || data.routes.length === 0) {
      return NextResponse.json({ routes: [] });
    }

    console.log(`[API /routes] Google Maps returned ${data.routes.length} route(s)`);

    // Process routes to add mock data
    const processedRoutes = data.routes.slice(0, 3).map((route, idx) => {
      const leg = route.legs[0];
      const encodedPolyline = route.overview_polyline.points;
      
      console.log(`[API /routes] Processing route ${idx + 1}:`, {
        hasLeg: !!leg,
        hasPolyline: !!encodedPolyline,
        distance: leg?.distance?.text,
        duration: leg?.duration?.text,
      });
      
      // Generate mocked data
      const values = generateSmoothGradientValues(encodedPolyline);
      const conditions = generateMockConditions(encodedPolyline, 8);

      return {
        distance: leg.distance.text,
        duration: leg.duration.text,
        // Add raw values for calculation if needed
        distanceValue: leg.distance.value,
        durationValue: leg.duration.value,
        polyline: encodedPolyline,
        summary: route.summary || 'Direct Route',
        values,
        conditions,
      };
    });

    console.log(`[API /routes] Returning ${processedRoutes.length} processed route(s)`);
    return NextResponse.json(processedRoutes);
  } catch (error) {
    console.error('Error fetching routes:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch routes' },
      { status: 500 }
    );
  }
}

