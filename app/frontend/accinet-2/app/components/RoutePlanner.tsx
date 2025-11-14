'use client';

import { useState } from 'react';
import PlaceSearch from './PlaceSearch';
import { getRoute, RouteDetails } from '../lib/route';
import polyline from '@mapbox/polyline';

interface PlaceCoordinates {
  lat: number;
  lng: number;
}

interface RoutePlannerProps {
  onRoutesLoaded: (routes: RouteDetails[]) => void;
  onError: (error: string) => void;
}

export default function RoutePlanner({ onRoutesLoaded, onError }: RoutePlannerProps) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originAddress, setOriginAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [originCoords, setOriginCoords] = useState<PlaceCoordinates | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<PlaceCoordinates | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Generates smooth random gradient values for a route polyline.
   * Uses key points with random values and smooth interpolation between them.
   */
  const generateSmoothGradientValues = (polylineString: string): number[] => {
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
  };

  const handleOriginSelect = (address: string, lat: number, lng: number) => {
    setOriginCoords({ lat, lng });
    setOriginAddress(address);
    console.log('Origin selected:', { address, lat, lng });
  };

  const handleDestinationSelect = (address: string, lat: number, lng: number) => {
    setDestinationCoords({ lat, lng });
    setDestinationAddress(address);
    console.log('Destination selected:', { address, lat, lng });
  };

  const handleSearch = async () => {
    if (!originAddress || !destinationAddress) {
      onError('Please select both origin and destination');
      return;
    }

    setIsLoading(true);
    try {
      const routes = await getRoute({
        origin: originAddress,
        destination: destinationAddress,
        mode: 'driving',
      });
      
      console.log(`Received ${routes.length} route(s) from backend.`);
      
      // Add random but smooth gradient values to each route
      const routesWithGradients = routes.map((route) => {
        if (route.polyline) {
          const values = generateSmoothGradientValues(route.polyline);
          return { ...route, values };
        }
        return route;
      });
      
      onRoutesLoaded(routesWithGradients);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch routes';
      console.error('Error fetching routes:', error);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-4">
      <PlaceSearch
        label="Origin"
        placeholder="Enter origin..."
        icon="origin"
        value={origin}
        onChange={setOrigin}
        onPlaceSelect={handleOriginSelect}
      />
      
      <PlaceSearch
        label="Destination"
        placeholder="Enter destination..."
        icon="destination"
        value={destination}
        onChange={setDestination}
        onPlaceSelect={handleDestinationSelect}
      />

      <button
        onClick={handleSearch}
        disabled={!originAddress || !destinationAddress || isLoading}
        className="w-full py-4 px-6 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:cursor-not-allowed text-zinc-100 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 border border-zinc-700"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Searching...</span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Search Routes
          </>
        )}
      </button>
    </div>
  );
}
