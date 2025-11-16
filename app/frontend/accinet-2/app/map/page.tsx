'use client';

import dynamic from 'next/dynamic';

// disable SSR just to be extra safe
const AcciNetMap = dynamic(() => import('../components/AcciNetMap'), {
  ssr: false,
  loading: () => <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading map...</div>,
});

export default function MapPage() {
  return <AcciNetMap />;
}
