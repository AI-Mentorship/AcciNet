'use client';

import { useEffect, useRef } from 'react';

interface RouteCondition {
  lat: number;
  lon: number;
  weather: {
    current_weather?: {
      temperature?: number;
      weathercode?: number;
      windspeed?: number;
    };
    error?: string;
  };
  road: {
    surface: string;
    road_type: string;
    condition: string;
    name: string;
  };
}

interface RoutePopupProps {
  condition: RouteCondition | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
}

export default function RoutePopup({ condition, position, onClose }: RoutePopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!condition || !position) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [condition, position, onClose]);

  if (!condition || !position) return null;

  const weather = condition.weather.current_weather;
  const road = condition.road;

  // Get weather description from WMO code
  const getWeatherDescription = (code?: number): string => {
    if (!code) return 'Unknown';
    const weatherCodes: Record<number, string> = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      85: 'Slight snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail',
    };
    return weatherCodes[code] || 'Unknown';
  };

  const getConditionColor = (condition: string): string => {
    switch (condition.toLowerCase()) {
      case 'good':
        return 'text-green-400';
      case 'poor':
        return 'text-red-400';
      default:
        return 'text-zinc-400';
    }
  };

  return (
    <div
      ref={popupRef}
      className="absolute z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-4 min-w-[280px] max-w-sm"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%) translateY(-10px)',
      }}
    >
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-zinc-400 hover:text-zinc-200 transition-colors"
        aria-label="Close"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100 mb-2">Road Information</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Road:</span>
              <span className="text-zinc-200">{road.name || 'Unnamed Road'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Type:</span>
              <span className="text-zinc-200 capitalize">{road.road_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Surface:</span>
              <span className="text-zinc-200 capitalize">{road.surface}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Condition:</span>
              <span className={`font-medium capitalize ${getConditionColor(road.condition)}`}>
                {road.condition}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-700 pt-3">
          <h3 className="text-lg font-semibold text-zinc-100 mb-2">Weather</h3>
          {weather && !condition.weather.error ? (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Temperature:</span>
                <span className="text-zinc-200">{weather.temperature?.toFixed(1)}°F</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Conditions:</span>
                <span className="text-zinc-200">{getWeatherDescription(weather.weathercode)}</span>
              </div>
              {weather.windspeed !== undefined && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Wind Speed:</span>
                  <span className="text-zinc-200">{weather.windspeed.toFixed(1)} mph</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-zinc-400">
              {condition.weather.error || 'Weather data unavailable'}
            </div>
          )}
        </div>

        <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-800">
          Coordinates: {condition.lat.toFixed(4)}, {condition.lon.toFixed(4)}
        </div>
      </div>
    </div>
  );
}








