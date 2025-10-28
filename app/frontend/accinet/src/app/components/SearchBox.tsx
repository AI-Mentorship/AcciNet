'use client'
import { APILoader, PlacePicker } from '@googlemaps/extended-component-library/react';
import React from 'react';
import { ArrowBigRight } from 'lucide-react';

interface SearchBoxProps {
    onSearch: (destinationAddress: string) => Promise<void>;
}

export default function SearchBox({ onSearch }: SearchBoxProps) {
    const [formattedAddress, setFormattedAddress] = React.useState('');

    const handlePlaceChange = (e: Event) => {
        const target = e.target as any;
        const place = target.value;

        if (!place) return;

        console.log("Full place:", JSON.parse(JSON.stringify(place)));
        console.log("Formatted address:", place.formattedAddress);

        setFormattedAddress(place.formattedAddress ?? '');
    };

    const handleClick = async () => {
        if (!formattedAddress) return;
        await onSearch(formattedAddress);
    };

    const countries = ['US'];

    return (
        <div>
            <APILoader
                apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                solutionChannel="GMP_GCC_placepicker_v1"
            />
            <div className="container flex flex-row gap-x-2">
                <PlacePicker
                    country={countries}
                    placeholder="Enter destination"
                    onPlaceChange={handlePlaceChange}
                />
                <button
                    className="flex border border-gray-400 rounded-md bg-red-600 items-center"
                    onClick={handleClick}
                >
                    <ArrowBigRight size={30} className="text-white px-1" />
                </button>
            </div>
        </div>
    );
}
