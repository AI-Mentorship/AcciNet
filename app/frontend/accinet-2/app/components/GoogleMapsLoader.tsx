'use client';

import { useEffect, useState } from 'react';

export default function GoogleMapsLoader() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API key not found');
      return;
    }

    // Check if script is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsLoaded(true);
      return;
    }

    // Check if script tag already exists
    const existingScript = document.querySelector(
      `script[src*="maps.googleapis.com/maps/api/js"]`
    ) as HTMLScriptElement;
    
    if (existingScript) {
      // Wait for existing script to load
      existingScript.onload = () => {
        if (window.google && window.google.maps && window.google.maps.places) {
          setIsLoaded(true);
        }
      };
      // If already loaded, set loaded state
      if (window.google && window.google.maps && window.google.maps.places) {
        setIsLoaded(true);
      }
      return;
    }

    // Load the script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        setIsLoaded(true);
      }
    };
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
    };
    document.head.appendChild(script);
  }, []);

  // Store loaded state in a way components can access it
  useEffect(() => {
    if (isLoaded) {
      // Dispatch custom event to notify components
      window.dispatchEvent(new Event('google-maps-loaded'));
    }
  }, [isLoaded]);

  return null;
}

