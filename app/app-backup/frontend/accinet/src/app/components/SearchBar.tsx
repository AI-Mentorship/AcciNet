"use client";

import { useRef, useState } from "react";
import { LoadScript, Autocomplete } from "@react-google-maps/api";

const libraries: ("places")[] = ["places"];

export default function SearchBar({ onSubmit }: { onSubmit: (data: any) => void }) {
    const originRef = useRef<HTMLInputElement>(null);
    const destRef = useRef<HTMLInputElement>(null);

    const originAutocomplete = useRef<google.maps.places.Autocomplete|null>(null);
    const destAutocomplete = useRef<google.maps.places.Autocomplete|null>(null);

    const [origin, setOrigin] = useState<google.maps.places.PlaceResult | null>(null);
    const [destination, setDestination] = useState<google.maps.places.PlaceResult | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!origin || !destination) return;
        onSubmit({
            origin: origin.place_id,
            destination: destination.place_id,
        });
    };

    return (
        <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY!} libraries={libraries}>
            <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-2 bg-white rounded-xl p-3 shadow-md w-full max-w-md"
            >
                {/* Origin Input */}
                <Autocomplete
                    onLoad={(autocomplete) => (originAutocomplete.current = autocomplete)}
                    onPlaceChanged={() => {
                        const place = originAutocomplete.current?.getPlace();
                        if (place) setOrigin(place);
                    }}
                >
                    <input
                        ref={originRef}
                        placeholder="Origin"
                        className="border rounded-md p-2"
                    />
                </Autocomplete>

                {/* Destination Input */}
                <Autocomplete
                    onLoad={(autocomplete) => (destAutocomplete.current = autocomplete)}
                    onPlaceChanged={() => {
                        const place = destAutocomplete.current?.getPlace();
                        if (place) setDestination(place);
                    }}
                >
                    <input
                        ref={destRef}
                        placeholder="Destination"
                        className="border rounded-md p-2"
                    />
                </Autocomplete>

                <button
                    type="submit"
                    className="bg-blue-600 text-white rounded-md p-2 hover:bg-blue-700 transition"
                >
                    Generate Route
                </button>
            </form>
        </LoadScript>
    );
}
