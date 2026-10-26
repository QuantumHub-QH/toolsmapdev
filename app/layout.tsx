import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MAPDEV // Tools Dev Map & Free Assets Hub',
  description: 'The premier open-source developer hub for Roblox Studio builders, map designers, and level artists. Free models, PBR textures, Luau scripts, and map utility tools.',
  keywords: ['roblox dev', 'map tools', 'free assets', 'luau scripts', 'pbr textures', 'lighting presets', 'level design'],
  authors: [{ name: 'MapDev Community' }],
  openGraph: {
    title: 'MAPDEV // Tools & Free Map Assets Hub',
    description: 'The premier open-source developer suite for map creators & builders.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#08080a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-white selection:text-black">
        {children}
      </body>
    </html>
  );
}
