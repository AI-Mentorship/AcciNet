'use client';

import { useState } from 'react';
import MapTileViewer from './components/MapTileViewer';
import RoutePlanner from './components/RoutePlanner';
import { RouteDetails } from './lib/route';

export default function Home() {
  const [routes, setRoutes] = useState<RouteDetails[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleRoutesLoaded = (loadedRoutes: RouteDetails[]) => {
    setRoutes(loadedRoutes);
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setRoutes([]);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black font-sans p-8">
      <main className="flex flex-col items-center gap-8 w-full max-w-7xl h-[calc(100vh-4rem)]">
        <div className="w-full flex-shrink-0">
          <h1 className="text-left text-4xl font-semibold leading-tight tracking-tight text-zinc-50 mb-4">
            AcciNet
          </h1>
          <RoutePlanner onRoutesLoaded={handleRoutesLoaded} onError={handleError} />
          {error && (
            <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}
        </div>
        <div className="w-full flex-1 min-h-[600px] border border-zinc-800 rounded-lg shadow-lg overflow-hidden ">
          <MapTileViewer
            initialZoom={13}
            initialCenter={[-96.75, 32.99]}
            routes={routes}
          />
        </div>
      <div className="text-white mt-10">Saved Routes</div>  
      </main>
    </div>
  );
}
