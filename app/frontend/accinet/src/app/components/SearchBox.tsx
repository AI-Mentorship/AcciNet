'use client'
import { APILoader, PlacePicker } from '@googlemaps/extended-component-library/react';
import React, { ChangeEvent } from 'react';

export default function SearchBox() {
    const [formattedAddress, setFormattedAddress] = React.useState('');

    const handlePlaceChange = (e: Event) => {
        const target = e.target as any;
        const place = target.value;

        if (!place) return;

        console.log("Full place:", JSON.parse(JSON.stringify(place)));
        console.log("Formatted address:", place.formattedAddress); // log just address

        setFormattedAddress(place.formattedAddress ?? '');
    };
    const countries = ['US'];

    return (
        <div>
            <APILoader apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY} solutionChannel="GMP_GCC_placepicker_v1" />
            <div className="container">
                <PlacePicker country={countries} placeholder="Enter a place to see its address" onPlaceChange={handlePlaceChange} />
                <div className="result">
                    {formattedAddress}
                </div>
            </div>
        </div>
    );
}
