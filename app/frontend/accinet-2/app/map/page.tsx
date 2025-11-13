// app/accinet/page.tsx
'use client';

import dynamic from 'next/dynamic';

// disable SSR just to be extra safe
const AcciNetMap = dynamic(() => import('../components/AcciNetMap'), {
  ssr: false,
});

export default function AcciNetPage() {
  return <AcciNetMap />;
}
