'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Wrench, 
  SunMedium, 
  Code2, 
  PlusCircle, 
  Bookmark, 
  Menu, 
  X, 
  Search,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface NavbarProps {
  onOpenSubmit: () => void;
  onOpenBookmarks: () => void;
  bookmarksCount: number;
  activeSection: string;
  setActiveSection: (section: string) => void;
  onSearchFocus: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSubmit,
  onOpenBookmarks,
  bookmarksCount,
  activeSection,
  setActiveSection,
  onSearchFocus,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'assets', label: 'Free Assets', icon: Box },
    { id: 'tools', label: 'Dev Tools', icon: Wrench },
    { id: 'lighting', label: 'Lighting Studio', icon: SunMedium },
    { id: 'snippets', label: 'Luau Scripts', icon: Code2 },
  ];

  const handleNavClick = (id: string) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleNavClick('assets')} 
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 border border-white/20 text-white shadow-inner group-hover:border-white/50 transition-colors">
              <Box className="h-5 w-5 text-white" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-base font-bold tracking-wider text-white">MAPDEV</span>
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-widest text-zinc-300">HUB</span>
              </div>
              <p className="text-[11px] font-mono text-zinc-400 hidden sm:block">TOOLS & FREE ASSETS</p>
            </div>
          </button>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 rounded-full border border-border bg-surface/80 p-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Quick Search Shortcut */}
          <button
            onClick={onSearchFocus}
            className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search...</span>
            <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">Ctrl K</kbd>
          </button>

          {/* Bookmarks Toggle */}
          <button
            onClick={onOpenBookmarks}
            className="relative flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-surface text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors"
            title="Saved Bookmarks"
          >
            <Bookmark className="h-4 w-4" />
            {bookmarksCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-black">
                {bookmarksCount}
              </span>
            )}
          </button>

          {/* Submit Asset Button */}
          <button
            onClick={onOpenSubmit}
            className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-zinc-200 transition-all shadow-sm active:scale-95"
          >
            <PlusCircle className="h-3.5 w-3.5 text-black" />
            <span className="hidden sm:inline">Submit Asset</span>
            <span className="sm:hidden">Submit</span>
          </button>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex md:hidden items-center justify-center h-9 w-9 rounded-lg border border-border bg-surface text-zinc-300 hover:text-white"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-background px-4 py-4 space-y-2 animate-fade-in">
          <div className="grid grid-cols-2 gap-2 pb-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-2 rounded-lg p-2.5 text-xs font-medium border text-left transition-colors ${
                    isActive
                      ? 'border-white bg-white text-black font-semibold'
                      : 'border-border bg-surface text-zinc-300 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono text-[11px]">V1.0 • OPEN SOURCE</span>
            <div className="flex items-center gap-1 text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Ready for Vercel</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
