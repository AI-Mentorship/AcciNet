'use client'
import { APILoader, PlacePicker } from '@googlemaps/extended-component-library/react';
import React from 'react';
import { MapPin, Navigation, Search, Moon, Sun } from 'lucide-react';
import useTheme from '../hooks/useTheme';

interface SearchBoxProps {
    onSearch: (originAddress: string, destinationAddress: string) => Promise<void>;
}

export default function SearchBox({ onSearch }: SearchBoxProps) {
    const [originAddress, setOriginAddress] = React.useState('');
    const [destinationAddress, setDestinationAddress] = React.useState('');
    const { isDark, toggle } = useTheme();

    const handleOriginChange = (e: Event) => {
        const target = e.target as any;
        const place = target.value;
        if (!place) return;
        setOriginAddress(place.formattedAddress ?? '');
    };

    const handleDestinationChange = (e: Event) => {
        const target = e.target as any;
        const place = target.value;
        if (!place) return;
        setDestinationAddress(place.formattedAddress ?? '');
    };

    const handleClick = async () => {
        if (!originAddress || !destinationAddress) return;
        await onSearch(originAddress, destinationAddress);
    };

    const countries = ['US'];

    return (
        <>
            <style>{`
                .route-planner-placepicker input {
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    background-color: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.375rem;
                    font-size: 0.875rem;
                    outline: none;
                    transition: all 0.2s;
                    color: #1f2937;
                }
                .route-planner-dark .route-planner-placepicker input {
                    background-color: #374151;
                    border-color: #4b5563;
                    color: #f9fafb;
                }
                .route-planner-placepicker input:focus {
                    outline: none;
                    box-shadow: 0 0 0 2px #3b82f6;
                    border-color: transparent;
                }
                .route-planner-dark .route-planner-placepicker input:focus {
                    box-shadow: 0 0 0 2px #60a5fa;
                }
                .route-planner-placepicker {
                    width: 100%;
                }
            `}</style>
            <div className={`${isDark ? 'bg-gray-800 text-white route-planner-dark' : 'bg-white text-gray-800'} rounded-lg shadow-lg p-4 w-80 transition-colors`}>
                <APILoader
                    apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                    solutionChannel="GMP_GCC_placepicker_v1"
                />
                <div className="flex items-center justify-between mb-4">
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Route Planner</h2>
                    <button
                        onClick={toggle}
                        className={`p-1 ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} rounded transition-colors`}
                        aria-label="Toggle theme"
                    >
                        {isDark ? (
                            <Sun className="w-5 h-5 text-yellow-400" />
                        ) : (
                            <Moon className="w-5 h-5 text-gray-700" />
                        )}
                    </button>
                </div>
                
                <div className="space-y-3">
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-600 z-10" />
                        <div className="pl-10 route-planner-placepicker">
                            <PlacePicker
                                country={countries}
                                placeholder="Enter origin..."
                                onPlaceChange={handleOriginChange}
                            />
                        </div>
                    </div>
                    
                    <div className="relative">
                        <Navigation className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-600 z-10" />
                        <div className="pl-10 route-planner-placepicker">
                            <PlacePicker
                                country={countries}
                                placeholder="Enter destination..."
                                onPlaceChange={handleDestinationChange}
                            />
                        </div>
                    </div>
                    
                    <button
                        onClick={handleClick}
                        disabled={!originAddress || !destinationAddress}
                        className={`w-full ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-800 hover:bg-gray-900'} text-white font-medium py-2.5 px-4 rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        <Search className="w-5 h-5" />
                        <span>Search Routes</span>
                    </button>
                </div>
            </div>
        </>
    );
}
