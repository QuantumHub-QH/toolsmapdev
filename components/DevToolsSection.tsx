'use client';

import React, { useState } from 'react';
import { 
  Wrench, 
  SunMedium, 
  Ruler, 
  Palette, 
  Code2, 
  Music, 
  Copy, 
  Check, 
  Sparkles,
  Play,
  RotateCcw,
  Sliders,
  Maximize2
} from 'lucide-react';
import { LIGHTING_PRESETS, CODE_SNIPPETS } from '@/lib/data';

export const DevToolsSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'color' | 'scale' | 'lighting' | 'code' | 'resolver'>('color');

  // Tool 1: Color Converter State
  const [hexColor, setHexColor] = useState('#00ffcc');
  const [colorCopied, setColorCopied] = useState<string | null>(null);

  const hexToRgb = (hex: string) => {
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map((c) => c + c).join('');
    }
    const num = parseInt(cleanHex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  };

  const rgb = hexToRgb(hexColor || '#000000');
  const color3FromRgb = `Color3.fromRGB(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  const color3FromHex = `Color3.fromHex("${hexColor.toUpperCase()}")`;
  const color3New = `Color3.new(${(rgb.r / 255).toFixed(3)}, ${(rgb.g / 255).toFixed(3)}, ${(rgb.b / 255).toFixed(3)})`;

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setColorCopied(label);
    setTimeout(() => setColorCopied(null), 2000);
  };

  // Tool 2: Scale Converter State
  const [studs, setStuds] = useState<number>(5);
  const STUDS_TO_METERS = 0.28;
  const meters = (studs * STUDS_TO_METERS).toFixed(2);
  const feet = (studs * STUDS_TO_METERS * 3.28084).toFixed(2);
  const cm = (studs * STUDS_TO_METERS * 100).toFixed(0);

  // Tool 3: Lighting Studio State
  const [clockTime, setClockTime] = useState<number>(14);
  const [brightness, setBrightness] = useState<number>(2.0);
  const [fogEnd, setFogEnd] = useState<number>(1000);
  const [outdoorAmbient, setOutdoorAmbient] = useState<string>('#606060');
  const [bloomIntensity, setBloomIntensity] = useState<number>(0.5);
  const [lightingScriptCopied, setLightingScriptCopied] = useState(false);

  const applyPreset = (presetId: string) => {
    const found = LIGHTING_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setClockTime(found.clockTime);
      setBrightness(found.brightness);
      setFogEnd(found.fogEnd);
      setBloomIntensity(found.bloom.intensity);
      const hex = `#${found.outdoorAmbient.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
      setOutdoorAmbient(hex);
    }
  };

  const generatedLightingScript = `-- [[ GENERATED LIGHTING SCRIPT ]]
local Lighting = game:GetService("Lighting")

Lighting.ClockTime = ${clockTime}
Lighting.Brightness = ${brightness}
Lighting.OutdoorAmbient = ${`Color3.fromHex("${outdoorAmbient}")`}
Lighting.FogEnd = ${fogEnd}

local bloom = Lighting:FindFirstChildOfClass("BloomEffect") or Instance.new("BloomEffect", Lighting)
bloom.Intensity = ${bloomIntensity}`;

  // Tool 4: Code Snippets State
  const [selectedSnippetId, setSelectedSnippetId] = useState<string>(CODE_SNIPPETS[0].id);
  const [codeCopied, setCodeCopied] = useState(false);
  const activeSnippet = CODE_SNIPPETS.find((s) => s.id === selectedSnippetId) || CODE_SNIPPETS[0];

  // Tool 5: Asset ID Resolver State
  const [assetIdInput, setAssetIdInput] = useState<string>('9114228941');
  const [assetIdCopied, setAssetIdCopied] = useState(false);

  return (
    <section id="tools" className="border-b border-border bg-background py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-mono text-zinc-400 mb-3">
            <Wrench className="h-3.5 w-3.5 text-white" />
            <span>DEVELOPER UTILITIES</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white uppercase">
            Map Creator & Luau Dev Tools
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Interactive calculators, syntax formatters, and environment configurators to supercharge your Roblox Studio workflow.
          </p>
        </div>

        {/* Tool Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {[
            { id: 'color', label: 'Color3 Converter', icon: Palette },
            { id: 'scale', label: 'Studs Scale Calc', icon: Ruler },
            { id: 'lighting', label: 'Lighting Studio', icon: SunMedium },
            { id: 'code', label: 'Luau Mechanics', icon: Code2 },
            { id: 'resolver', label: 'Asset ID Resolver', icon: Music },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-white text-black shadow-lg scale-105'
                    : 'border border-border bg-surface text-zinc-400 hover:border-zinc-700 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tool Content Panels */}
        <div className="rounded-2xl border border-zinc-800 bg-surface p-6 sm:p-8 shadow-2xl">
          
          {/* TAB 1: COLOR3 CONVERTER */}
          {activeTab === 'color' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Palette className="h-5 w-5 text-white" />
                    Luau Color3 & Hex Converter
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Pick any color or input hex to generate studio-ready Luau color constructors.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={hexColor}
                    onChange={(e) => setHexColor(e.target.value)}
                    className="h-10 w-12 cursor-pointer rounded-lg border border-border bg-black p-1"
                  />
                  <input
                    type="text"
                    value={hexColor}
                    onChange={(e) => setHexColor(e.target.value)}
                    placeholder="#ffffff"
                    className="w-28 rounded-lg border border-border bg-black px-3 py-2 text-xs font-mono text-white focus:border-white focus:outline-none uppercase"
                  />
                </div>
              </div>

              {/* Color Swatch Preview & Preset Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-xl border border-border bg-black/60 p-4 flex flex-col items-center justify-center space-y-3">
                  <div
                    className="h-24 w-full rounded-lg shadow-inner border border-white/20 transition-all duration-300"
                    style={{ backgroundColor: hexColor }}
                  />
                  <span className="font-mono text-xs font-bold text-white tracking-widest uppercase">
                    ACTIVE COLOR SWATCH
                  </span>
                  
                  {/* Quick Preset Colors */}
                  <div className="flex items-center gap-2 pt-2">
                    {['#00ffcc', '#ff2a5f', '#8a2be2', '#ffaa00', '#00e676', '#ffffff', '#1a1a1a'].map((color) => (
                      <button
                        key={color}
                        onClick={() => setHexColor(color)}
                        style={{ backgroundColor: color }}
                        className="h-6 w-6 rounded-full border border-white/30 hover:scale-125 transition-transform"
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                {/* Formatted Outputs */}
                <div className="md:col-span-2 space-y-3">
                  {[
                    { label: 'Color3.fromRGB', value: color3FromRgb, desc: 'Most common Studio format (0-255)' },
                    { label: 'Color3.fromHex', value: color3FromHex, desc: 'Hex constructor format' },
                    { label: 'Color3.new', value: color3New, desc: 'Normalized decimal format (0.0 - 1.0)' },
                    { label: 'CSS Hex', value: hexColor.toUpperCase(), desc: 'Web UI & SVG format' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-xl border border-border bg-black/40 p-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-white">{item.label}</span>
                          <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">({item.desc})</span>
                        </div>
                        <code className="font-mono text-xs text-zinc-300 mt-1 block select-all">
                          {item.value}
                        </code>
                      </div>

                      <button
                        onClick={() => copyText(item.value, item.label)}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-zinc-900 px-3 py-1.5 text-xs font-mono text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
                      >
                        {colorCopied === item.label ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SCALE CONVERTER */}
          {activeTab === 'scale' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-border">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Ruler className="h-5 w-5 text-white" />
                  Roblox Studs to Real-World Scale Calculator
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Standard Roblox physics conversion: 1 Stud = 0.28 Meters (approx. 0.92 Feet). Keep map proportions realistic.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                {/* Input Slider */}
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center justify-between text-xs font-mono text-zinc-300 mb-2">
                      <span>Roblox Studs:</span>
                      <span className="text-lg font-bold text-white">{studs} Studs</span>
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="100"
                      step="0.5"
                      value={studs}
                      onChange={(e) => setStuds(parseFloat(e.target.value))}
                      className="w-full accent-white h-2 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Quick Scale Presets */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {[
                      { label: 'Character Height (5 Studs)', val: 5 },
                      { label: 'Doorway Height (8 Studs)', val: 8 },
                      { label: 'Standard Room (16 Studs)', val: 16 },
                      { label: 'Street Width (32 Studs)', val: 32 },
                      { label: 'Building Floor (14 Studs)', val: 14 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => setStuds(preset.val)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-mono border transition-colors ${
                          studs === preset.val
                            ? 'border-white bg-white text-black font-semibold'
                            : 'border-border bg-black/40 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Real World Equivalents */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl border border-border bg-black/50 p-4">
                    <span className="text-[10px] font-mono text-zinc-500 block mb-1">METERS</span>
                    <span className="text-2xl font-bold font-mono text-white">{meters}</span>
                    <span className="text-[11px] font-mono text-zinc-400 block mt-1">m</span>
                  </div>

                  <div className="rounded-xl border border-border bg-black/50 p-4">
                    <span className="text-[10px] font-mono text-zinc-500 block mb-1">FEET</span>
                    <span className="text-2xl font-bold font-mono text-white">{feet}</span>
                    <span className="text-[11px] font-mono text-zinc-400 block mt-1">ft</span>
                  </div>

                  <div className="rounded-xl border border-border bg-black/50 p-4">
                    <span className="text-[10px] font-mono text-zinc-500 block mb-1">CENTIMETERS</span>
                    <span className="text-2xl font-bold font-mono text-white">{cm}</span>
                    <span className="text-[11px] font-mono text-zinc-400 block mt-1">cm</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LIGHTING STUDIO */}
          {activeTab === 'lighting' && (
            <div id="lighting" className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <SunMedium className="h-5 w-5 text-white" />
                    Atmosphere & Lighting Studio
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Live lighting configurator with preset atmospheric palettes and ready-to-run Luau script.
                  </p>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {LIGHTING_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => applyPreset(p.id)}
                      className="rounded-lg border border-border bg-black/40 px-2.5 py-1 text-[11px] font-mono text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sliders */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-mono text-zinc-300 mb-1">
                      <span>ClockTime (Time of Day):</span>
                      <span className="text-white font-bold">{clockTime}h</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="24"
                      step="0.5"
                      value={clockTime}
                      onChange={(e) => setClockTime(parseFloat(e.target.value))}
                      className="w-full accent-white h-2 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono text-zinc-300 mb-1">
                      <span>Sun Brightness:</span>
                      <span className="text-white font-bold">{brightness}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.1"
                      value={brightness}
                      onChange={(e) => setBrightness(parseFloat(e.target.value))}
                      className="w-full accent-white h-2 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono text-zinc-300 mb-1">
                      <span>Fog Distance (FogEnd):</span>
                      <span className="text-white font-bold">{fogEnd} studs</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="3000"
                      step="50"
                      value={fogEnd}
                      onChange={(e) => setFogEnd(parseInt(e.target.value))}
                      className="w-full accent-white h-2 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono text-zinc-300 mb-1">
                      <span>Bloom Effect Intensity:</span>
                      <span className="text-white font-bold">{bloomIntensity}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={bloomIntensity}
                      onChange={(e) => setBloomIntensity(parseFloat(e.target.value))}
                      className="w-full accent-white h-2 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-mono text-zinc-300">OutdoorAmbient Tint:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={outdoorAmbient}
                        onChange={(e) => setOutdoorAmbient(e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded border border-border bg-black p-0.5"
                      />
                      <span className="font-mono text-xs text-white uppercase">{outdoorAmbient}</span>
                    </div>
                  </div>
                </div>

                {/* Generated Luau Box */}
                <div className="flex flex-col justify-between rounded-xl border border-border bg-black/60 p-4">
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                      <span className="font-mono text-xs text-zinc-400">Generated Command Bar Script</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedLightingScript);
                          setLightingScriptCopied(true);
                          setTimeout(() => setLightingScriptCopied(false), 2000);
                        }}
                        className="flex items-center gap-1.5 rounded bg-white px-2.5 py-1 text-xs font-mono font-bold text-black hover:bg-zinc-200"
                      >
                        {lightingScriptCopied ? <Check className="h-3 w-3 text-black" /> : <Copy className="h-3 w-3 text-black" />}
                        <span>{lightingScriptCopied ? 'Copied!' : 'Copy Script'}</span>
                      </button>
                    </div>
                    <pre className="font-mono text-[11px] text-zinc-300 leading-relaxed overflow-x-auto p-2">
                      <code>{generatedLightingScript}</code>
                    </pre>
                  </div>
                  <p className="text-[10px] font-mono text-zinc-500 pt-2 border-t border-border/60">
                    Paste this snippet directly into Roblox Studio Command Bar or a ServerScript inside ServerScriptService.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LUAU MECHANICS GENERATOR */}
          {activeTab === 'code' && (
            <div id="snippets" className="space-y-6">
              <div className="pb-4 border-b border-border">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Code2 className="h-5 w-5 text-white" />
                  Luau Mechanics & Script Generator
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Tested and secure game mechanics scripts for your map. Copy and plug directly into Studio parts.
                </p>
              </div>

              {/* Snippet Selection Chips */}
              <div className="flex flex-wrap gap-2">
                {CODE_SNIPPETS.map((snippet) => {
                  const isSelected = snippet.id === selectedSnippetId;
                  return (
                    <button
                      key={snippet.id}
                      onClick={() => setSelectedSnippetId(snippet.id)}
                      className={`rounded-xl px-3.5 py-2 text-xs font-medium border transition-colors ${
                        isSelected
                          ? 'border-white bg-white text-black font-semibold'
                          : 'border-border bg-black/40 text-zinc-300 hover:border-zinc-700 hover:text-white'
                      }`}
                    >
                      {snippet.title}
                    </button>
                  );
                })}
              </div>

              {/* Code Box */}
              <div className="rounded-xl border border-border bg-black/80 p-4">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
                  <div>
                    <h4 className="text-sm font-semibold text-white">{activeSnippet.title}</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">{activeSnippet.description}</p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activeSnippet.code);
                      setCodeCopied(true);
                      setTimeout(() => setCodeCopied(false), 2000);
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-mono font-bold text-black hover:bg-zinc-200 transition-colors"
                  >
                    {codeCopied ? <Check className="h-3.5 w-3.5 text-black" /> : <Copy className="h-3.5 w-3.5 text-black" />}
                    <span>{codeCopied ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
                <pre className="max-h-72 overflow-y-auto font-mono text-xs text-zinc-300 leading-relaxed p-2">
                  <code>{activeSnippet.code}</code>
                </pre>
              </div>
            </div>
          )}

          {/* TAB 5: ASSET ID RESOLVER */}
          {activeTab === 'resolver' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-border">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Music className="h-5 w-5 text-white" />
                  Roblox Asset ID Resolver & Sound Tester
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Test and construct Roblox Studio asset links, audio play links, and rbxassetid format strings.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-zinc-300 mb-1.5">
                      Enter Raw Roblox Asset ID:
                    </label>
                    <input
                      type="text"
                      value={assetIdInput}
                      onChange={(e) => setAssetIdInput(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="e.g. 9114228941"
                      className="w-full rounded-xl border border-border bg-black px-4 py-2.5 font-mono text-sm text-white focus:border-white focus:outline-none"
                    />
                  </div>

                  <div className="rounded-xl border border-border bg-black/40 p-4 space-y-2">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase block">Sample Asset IDs to test:</span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Rain Ambience', id: '9114228941' },
                        { label: 'Cyber Lamp', id: '13894729104' },
                        { label: 'Pine Foliage', id: '14029381722' },
                        { label: 'PBR Asphalt', id: '14109827364' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setAssetIdInput(item.id)}
                          className="rounded border border-border bg-zinc-900 px-2 py-1 text-[11px] font-mono text-zinc-300 hover:border-zinc-500 hover:text-white"
                        >
                          {item.label} ({item.id})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Outputs */}
                <div className="space-y-3">
                  <div className="rounded-xl border border-border bg-black/50 p-3">
                    <span className="text-[10px] font-mono text-zinc-500 block">STUDIO RBXASSETID FORMAT</span>
                    <div className="flex items-center justify-between mt-1">
                      <code className="font-mono text-xs text-white">rbxassetid://{assetIdInput || '0'}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`rbxassetid://${assetIdInput}`);
                          setAssetIdCopied(true);
                          setTimeout(() => setAssetIdCopied(false), 2000);
                        }}
                        className="rounded border border-border bg-zinc-900 px-2.5 py-1 text-xs font-mono text-zinc-300 hover:text-white"
                      >
                        {assetIdCopied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-black/50 p-3">
                    <span className="text-[10px] font-mono text-zinc-500 block">ROBLOX CATALOG / LIBRARY LINK</span>
                    <div className="flex items-center justify-between mt-1">
                      <a
                        href={`https://www.roblox.com/library/${assetIdInput}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-blue-400 hover:underline truncate"
                      >
                        roblox.com/library/{assetIdInput}
                      </a>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-black/50 p-3">
                    <span className="text-[10px] font-mono text-zinc-500 block">ASSET DELIVERY CDN URL</span>
                    <div className="mt-1">
                      <code className="font-mono text-[11px] text-zinc-400 break-all">
                        https://assetdelivery.roblox.com/v1/asset/?id={assetIdInput}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </section>
  );
};
