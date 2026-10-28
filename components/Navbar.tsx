'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Wrench, 
  SunMedium, 
  Code2, 
  Bookmark, 
  Menu, 
  X, 
  Search,
  Sparkles,
  LogOut,
  ShieldCheck,
  Crown
} from 'lucide-react';
import { DiscordUser } from './DiscordAuthModal';
import { PREMIUM_PLANS } from '@/lib/premium-config';
import { DISCORD_PREMIUM_CONTACT_URL } from '@/lib/discord';

interface NavbarProps {
  onOpenBookmarks: () => void;
  bookmarksCount: number;
  activeSection: string;
  setActiveSection: (section: string) => void;
  onSearchFocus: () => void;
  discordUser: DiscordUser | null;
  onOpenDiscordAuth: () => void;
  onLogoutDiscord: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenBookmarks,
  bookmarksCount,
  activeSection,
  setActiveSection,
  onSearchFocus,
  discordUser,
  onOpenDiscordAuth,
  onLogoutDiscord,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isPremiumPlansOpen, setIsPremiumPlansOpen] = useState(false);

  const navItems = [
    { id: 'assets', label: 'Map Assets', icon: Box },
    { id: 'tools', label: 'Dev Tools', icon: Wrench },
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
          <button
            onClick={() => setIsPremiumPlansOpen(true)}
            aria-label="Beli Premium"
            className="flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-400/10 px-2.5 py-2 text-[10px] sm:px-3.5 sm:text-xs font-bold font-mono text-amber-200 transition-colors hover:bg-amber-400/20"
          >
            <Crown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">BUY PREMIUM</span>
          </button>

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

          {/* Discord Auth User Profile / Connect Button */}
          {discordUser ? (
            <div className="flex items-center gap-2 rounded-xl border border-[#5865F2]/40 bg-[#5865F2]/10 p-1 pr-2">
              <img
                src={discordUser.avatarUrl}
                alt={discordUser.username}
                className="h-7 w-7 rounded-lg bg-black object-cover border border-[#5865F2]/50"
              />
              <div className="hidden sm:block text-left">
                <p className="text-[11px] font-mono font-bold text-white leading-none truncate max-w-[100px]">
                  @{discordUser.username}
                </p>
                <span className={`text-[9px] font-mono flex items-center gap-1 ${discordUser.isPremium ? 'text-amber-300' : 'text-emerald-400'}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {discordUser.isPremium ? 'Premium' : 'Authorized'}
                </span>
              </div>
              <button
                onClick={onLogoutDiscord}
                className="p-1 rounded-md text-zinc-400 hover:text-red-400 hover:bg-black/30 transition-colors ml-1"
                title="Keluar dari Discord"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenDiscordAuth}
              className="flex items-center gap-2 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] px-3.5 py-2 text-xs font-bold font-mono text-white transition-all shadow-md active:scale-95"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              <span className="hidden sm:inline">Authorize Discord</span>
              <span className="sm:hidden">Authorize</span>
            </button>
          )}

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
              <span>Free & Open</span>
            </div>
          </div>
        </div>
      )}

      {isPremiumPlansOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="premium-plans-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-amber-400/30 bg-[#101014] p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-amber-300">
                  <Crown className="h-3.5 w-3.5" /> Premium Membership
                </p>
                <h2 id="premium-plans-title" className="mt-1 text-lg font-bold text-white">
                  Pilih Paket Premium
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Pilih paket untuk menghubungi admin lewat Discord.
                </p>
              </div>
              <button
                onClick={() => setIsPremiumPlansOpen(false)}
                className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-400 hover:text-white"
                aria-label="Tutup pilihan paket Premium"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {PREMIUM_PLANS.map((plan) => (
                <a
                  key={plan.duration}
                  href={DISCORD_PREMIUM_CONTACT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsPremiumPlansOpen(false)}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black/40 px-4 py-3 transition-colors hover:border-amber-400/50 hover:bg-amber-400/5"
                >
                  <span className="text-sm font-semibold text-white">{plan.label}</span>
                  <span className="font-mono text-sm font-bold text-amber-300">{plan.price}</span>
                </a>
              ))}
            </div>
            <p className="mt-4 text-center text-[10px] text-zinc-500">
              Pembelian dikonfirmasi manual melalui Discord.
            </p>
          </div>
        </div>
      )}
    </header>
  );
};
