'use client';

import { useState } from 'react';
import PlaceSearch from './PlaceSearch';
import { getRoute, RouteDetails } from '../lib/route';

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
      onRoutesLoaded(routes);
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
