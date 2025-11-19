'use client';

import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// disable SSR just to be extra safe
const AcciNetMap = dynamic(() => import('../components/AcciNetMap'), {
  ssr: false,
  loading: () => <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading map...</div>,
});

function MapPageContent() {
  const searchParams = useSearchParams();
  
  // Extract route parameters from URL
  const origin = searchParams.get('origin');
  const destination = searchParams.get('destination');
  const autoSearch = searchParams.get('autoSearch') === 'true';
  
  return <AcciNetMap 
    initialOrigin={origin || undefined} 
    initialDestination={destination || undefined}
    autoSearch={autoSearch}
  />;
}

export default function MapPage() {
  return (
    <Suspense fallback={<div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading map...</div>}>
      <MapPageContent />
    </Suspense>
  );
}
