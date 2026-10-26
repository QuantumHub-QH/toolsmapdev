import { NextResponse } from 'next/server';
import { LIGHTING_PRESETS, CODE_SNIPPETS } from '@/lib/data';

export async function GET() {
  const tools = [
    {
      id: 'color-converter',
      name: 'Luau Color3 & Hex Converter',
      description: 'Convert CSS Hex, RGB, and Luau Color3.fromRGB / Color3.new formats with real-time swatch preview.',
      category: 'converter',
      badge: 'COLOR',
    },
    {
      id: 'scale-calculator',
      name: 'Studs to Real-World Scale Calculator',
      description: 'Accurate scale converter between Roblox Studs, Meters, Centimeters, and Feet for realistic map sizing.',
      category: 'calculator',
      badge: 'SCALE',
    },
    {
      id: 'lighting-studio',
      name: 'Lighting & Atmosphere Studio',
      description: 'Interactive Lighting configurator for ClockTime, Fog, Bloom, and Ambient tints with 1-click Luau script export.',
      category: 'generator',
      badge: 'LIGHTING',
    },
    {
      id: 'code-generator',
      name: 'Luau Mechanics Generator',
      description: 'Configurable game mechanics templates: Doors, KillBricks, Teleporters, Audio zones, and Leaderstats.',
      category: 'generator',
      badge: 'LUAU',
    },
    {
      id: 'id-resolver',
      name: 'Roblox Asset ID Resolver',
      description: 'Test sound playback and generate direct CDN asset URLs from any raw Roblox asset ID.',
      category: 'tester',
      badge: 'RESOLVER',
    },
  ];

  return NextResponse.json({
    success: true,
    tools,
    presets: LIGHTING_PRESETS,
    snippets: CODE_SNIPPETS,
  });
}
