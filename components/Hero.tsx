'use client';

import React from 'react';
import { Search, Sparkles, Filter, DownloadCloud, Layers, Cpu, Crown } from 'lucide-react';
import { AssetCategory } from '@/types';

interface HeroProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: AssetCategory;
  setSelectedCategory: (cat: AssetCategory) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  totalAssets: number;
  totalDownloads: number;
}

const CATEGORIES: { id: AssetCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'All Resources', icon: '✦' },
  { id: 'models', label: '3D Models & Props', icon: '📦' },
  { id: 'pbr', label: 'PBR Textures', icon: '🎨' },
  { id: 'scripts', label: 'Luau Scripts', icon: '⚡' },
  { id: 'lighting', label: 'Lighting Presets', icon: '☀️' },
  { id: 'skyboxes', label: '8K Skyboxes', icon: '🌌' },
  { id: 'sfx', label: 'Map Audio & SFX', icon: '🔊' },
  { id: 'ui', label: 'Developer UI Kits', icon: '🖥️' },
];

export const Hero: React.FC<HeroProps> = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  searchInputRef,
  totalAssets,
  totalDownloads,
}) => {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background pt-12 pb-10">
      {/* Subtle Background Glow & Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Top Developer Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1 text-xs font-mono text-zinc-300 mb-6 shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>ROBLOX STUDIO & MAP DEVELOPER SUITE</span>
          <span className="text-zinc-600">|</span>
          <span className="text-white font-semibold">100% FREE ASSETS</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white uppercase max-w-4xl mx-auto leading-tight">
          Tools Dev Map & <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">Free Asset Hub</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-4 text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Level design toolkit, production-grade Luau mechanics, 4K PBR surfaces, modular 3D props, and interactive map calculators for builders & developers.
        </p>

        {/* Quick Real-Time Stats Strip */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
          {/* Real-time Free Assets Count */}
          <div className="rounded-xl border border-border bg-surface/60 p-3 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-1.5 text-zinc-400 text-xs mb-1">
              <Layers className="h-3.5 w-3.5" />
              <span>Free Assets</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {totalAssets}
            </div>
          </div>

          {/* Dev Tools Count */}
          <div className="rounded-xl border border-border bg-surface/60 p-3 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-1.5 text-zinc-400 text-xs mb-1">
              <Cpu className="h-3.5 w-3.5" />
              <span>Dev Tools</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">5 Engines</div>
          </div>

          {/* Real-time Downloads Count */}
          <div className="rounded-xl border border-border bg-surface/60 p-3 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-1.5 text-zinc-400 text-xs mb-1">
              <DownloadCloud className="h-3.5 w-3.5" />
              <span>Downloads</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {totalDownloads}
            </div>
          </div>

          {/* Premium Users Slot */}
          <div className="rounded-xl border border-border bg-surface/60 p-3 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-1.5 text-zinc-400 text-xs mb-1">
              <Crown className="h-3.5 w-3.5 text-amber-400" />
              <span>Premium User</span>
            </div>
            <div className="text-xl font-bold font-mono text-amber-300">
              0 <span className="text-[11px] font-mono text-zinc-500 font-normal">(Coming Soon)</span>
            </div>
          </div>
        </div>

        {/* Central Search Bar */}
        <div className="mt-8 max-w-2xl mx-auto">
          <div className="relative flex items-center">
            <Search className="absolute left-4 h-5 w-5 text-zinc-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets, scripts, textures, or tags (e.g. door, pbr, lighting)..."
              className="w-full rounded-2xl border border-border bg-surface py-3.5 pl-12 pr-28 text-sm text-white placeholder-zinc-500 focus:border-white focus:outline-none focus:ring-1 focus:ring-white transition-all shadow-lg"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-20 text-xs text-zinc-400 hover:text-white px-2 py-1"
              >
                Clear
              </button>
            )}
            <div className="absolute right-3 flex items-center">
              <span className="hidden sm:inline-block rounded-md border border-zinc-700 bg-zinc-800/80 px-2 py-1 text-[11px] font-mono text-zinc-400">
                ⌘K / Ctrl+K
              </span>
            </div>
          </div>
        </div>

        {/* Category Pill Filters */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-white text-black font-semibold shadow-md scale-105'
                    : 'border border-border bg-surface text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                {cat.id === 'all' && (
                  <span className={`ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-black/10 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                    {totalAssets}
                  </span>
                )}
              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
};
