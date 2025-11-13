import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AcciNet',
  description: 'AcciNet crash intelligence explorer',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
