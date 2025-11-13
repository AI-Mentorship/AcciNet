'use client';

import PlacesAutocomplete, {
  geocodeByAddress,
  getLatLng,
} from 'react-places-autocomplete';
import { useState, useEffect } from 'react';

interface PlaceSearchProps {
  label: string;
  placeholder: string;
  icon: 'origin' | 'destination';
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (address: string, lat: number, lng: number) => void;
}

export default function PlaceSearch({
  label,
  placeholder,
  icon,
  value,
  onChange,
  onPlaceSelect,
}: PlaceSearchProps) {
  const [address, setAddress] = useState(value);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

  // Check if Google Maps is loaded
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        setIsGoogleMapsLoaded(true);
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkGoogleMaps()) {
      return;
    }

    // Listen for the load event
    const handleLoad = () => {
      checkGoogleMaps();
    };

    window.addEventListener('google-maps-loaded', handleLoad);

    // Also poll as a fallback
    const interval = setInterval(() => {
      if (checkGoogleMaps()) {
        clearInterval(interval);
      }
    }, 100);

    return () => {
      window.removeEventListener('google-maps-loaded', handleLoad);
      clearInterval(interval);
    };
  }, []);

  // Sync internal state with prop value
  useEffect(() => {
    setAddress(value);
  }, [value]);

  const handleSelect = async (selectedAddress: string) => {
    try {
      const results = await geocodeByAddress(selectedAddress);
      const latLng = await getLatLng(results[0]);
      setAddress(selectedAddress);
      onChange(selectedAddress);
      onPlaceSelect(selectedAddress, latLng.lat, latLng.lng);
    } catch (error) {
      console.error('Error selecting place:', error);
    }
  };

  const handleChange = (newAddress: string) => {
    setAddress(newAddress);
    onChange(newAddress);
  };

  // Define icon component
  const iconComponent = icon === 'origin' ? (
    // Location pin icon (blue)
    <svg
      className="w-5 h-5 text-blue-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ) : (
    // Paper airplane icon (green)
    <svg
      className="w-5 h-5 text-green-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
      />
    </svg>
  );

  // Don't render PlacesAutocomplete until Google Maps is loaded
  if (!isGoogleMapsLoaded) {
    return (
      <div className="relative">
        <label className="sr-only">{label}</label>
        <div className="relative flex items-center">
          {/* Icon on the left */}
          <div className="absolute left-4 z-10">{iconComponent}</div>
          
          {/* Search icon inside input */}
          <div className="absolute left-12 z-10">
            <svg
              className="w-4 h-4 text-zinc-400"
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
          </div>

          <input
            type="text"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              onChange(e.target.value);
            }}
            placeholder={placeholder}
            disabled
            className="w-full pl-20 pr-4 py-4 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 opacity-50 cursor-not-allowed"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="sr-only">{label}</label>
      <PlacesAutocomplete
        value={address}
        onChange={handleChange}
        onSelect={handleSelect}
        searchOptions={{
          types: ['geocode', 'establishment'],
        }}
      >
        {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
          <div className="relative">
            <div className="relative flex items-center">
              {/* Icon on the left */}
              <div className="absolute left-4 z-10">{iconComponent}</div>
              
              {/* Search icon inside input */}
              <div className="absolute left-12 z-10">
                <svg
                  className="w-4 h-4 text-zinc-400"
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
              </div>

              <input
                {...getInputProps({
                  placeholder,
                  className:
                    'w-full pl-20 pr-4 py-4 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all',
                })}
              />
            </div>

            {/* Suggestions dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg max-h-60 overflow-auto">
                {loading && (
                  <div className="px-4 py-2 text-zinc-400 text-sm">Loading...</div>
                )}
                {suggestions.map((suggestion) => {
                  const className = suggestion.active
                    ? 'px-4 py-3 bg-zinc-800 text-zinc-100 cursor-pointer'
                    : 'px-4 py-3 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 cursor-pointer';
                  
                  return (
                    <div
                      {...getSuggestionItemProps(suggestion, {
                        className,
                      })}
                      key={suggestion.placeId}
                    >
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-zinc-500 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span className="text-sm">{suggestion.description}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </PlacesAutocomplete>
    </div>
  );
}
