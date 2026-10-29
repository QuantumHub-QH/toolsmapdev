'use client';

import React from 'react';
import { Terminal } from 'lucide-react';

interface FooterProps {
  onNavigateSection: (section: 'assets' | 'tools') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateSection }) => {
  return (
    <footer className="border-t border-border bg-background pt-12 pb-8 text-xs text-zinc-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-border">
          {/* Col 1: Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-black font-bold font-mono text-xs">
                MD
              </div>
              <span className="font-mono text-sm font-bold text-white tracking-wider">MAPDEV HUB</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Curated free tools, 3D props, PBR materials, and Luau script engines built by map creators for Roblox Studio builders.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>All Systems Operational • Free & Open</span>
            </div>
          </div>

          {/* Col 2: Dev Modules */}
          <div>
            <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider mb-3">
              Developer Modules
            </h4>
            <ul className="space-y-2 text-xs">
              <li><button type="button" onClick={() => onNavigateSection('assets')} className="hover:text-white transition-colors">Free 3D Prop Library</button></li>
              <li><button type="button" onClick={() => onNavigateSection('assets')} className="hover:text-white transition-colors">4K PBR Surface Manager</button></li>
              <li><button type="button" onClick={() => onNavigateSection('tools')} className="hover:text-white transition-colors">Luau Color3 Converter</button></li>
              <li><button type="button" onClick={() => onNavigateSection('tools')} className="hover:text-white transition-colors">Studs Scale Calculator</button></li>
              <li><button type="button" onClick={() => onNavigateSection('tools')} className="hover:text-white transition-colors">Atmosphere & Fog Studio</button></li>
              <li><a href="/admin-panel" className="hover:text-white transition-colors">Admin Panel</a></li>
            </ul>
          </div>

          {/* Col 3: Deployment & Git */}
          <div>
            <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider mb-3">
              GitHub & Vercel Ready
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5 text-zinc-300">
                <Terminal className="h-3.5 w-3.5 text-zinc-500" />
                <span>Next.js 14 App Router</span>
              </li>
              <li className="flex items-center gap-1.5 text-zinc-300">
                <Terminal className="h-3.5 w-3.5 text-zinc-500" />
                <span>Zero-Config Vercel Deploy</span>
              </li>
              <li className="flex items-center gap-1.5 text-zinc-300">
                <Terminal className="h-3.5 w-3.5 text-zinc-500" />
                <span>REST API Endpoints included</span>
              </li>
              <li className="flex items-center gap-1.5 text-zinc-300">
                <Terminal className="h-3.5 w-3.5 text-zinc-500" />
                <span>Fully Responsive Mobile & PC</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Quick Shortcuts */}
          <div>
            <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider mb-3">
              Dev Shortcuts
            </h4>
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between rounded bg-zinc-900/60 px-2 py-1 border border-zinc-800">
                <span className="text-zinc-400">Search Assets</span>
                <kbd className="text-zinc-200">Ctrl + K</kbd>
              </div>
              <div className="flex items-center justify-between rounded bg-zinc-900/60 px-2 py-1 border border-zinc-800">
                <span className="text-zinc-400">Close Modals</span>
                <kbd className="text-zinc-200">ESC</kbd>
              </div>
              <div className="flex items-center justify-between rounded bg-zinc-900/60 px-2 py-1 border border-zinc-800">
                <span className="text-zinc-400">Copy Asset ID</span>
                <kbd className="text-zinc-200">Click Card ID</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono text-zinc-500">
          <p>© {new Date().getFullYear()} MAPDEV HUB. Free for Personal & Commercial Game Development.</p>
          <div className="flex items-center gap-4">
            <span className="text-zinc-400">Designed with Next.js & Tailwind CSS</span>
            <span className="text-zinc-600">|</span>
            <span className="text-white font-medium">Ready to Push & Deploy</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
