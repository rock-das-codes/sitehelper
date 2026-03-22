import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bridge Progress Dashboard',
  description: 'Progress Schematic Dashboard v2.0',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased font-sans bg-slate-900 text-white text-base leading-relaxed">{children}</body>
    </html>
  );
}
