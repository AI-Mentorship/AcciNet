'use client';

import dynamic from 'next/dynamic';

// Disable SSR for map component
const HistoricalDensityMap = dynamic(() => import('../components/HistoricalDensityMap'), {
  ssr: false,
});

export default function DensityPage() {
  return <HistoricalDensityMap />;
}

