'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { AssetCard } from '@/components/AssetCard';
import { AssetModal } from '@/components/AssetModal';
import { DevToolsSection } from '@/components/DevToolsSection';
import { SubmitModal } from '@/components/SubmitModal';
import { BookmarksModal } from '@/components/BookmarksModal';
import { Footer } from '@/components/Footer';
import { ASSETS_DATA } from '@/lib/data';
import { Asset, AssetCategory } from '@/types';
import { SlidersHorizontal, Sparkles, Box, CheckCircle } from 'lucide-react';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'downloads'>('popular');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('assets');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load bookmarks from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mapdev_bookmarks');
      if (saved) {
        setBookmarkedIds(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Save bookmarks
  const toggleBookmark = (id: string) => {
    setBookmarkedIds((prev) => {
      let next: string[];
      if (prev.includes(id)) {
        next = prev.filter((item) => item !== id);
        showToast('Asset removed from bookmarks');
      } else {
        next = [...prev, id];
        showToast('Asset saved to bookmarks!');
      }
      try {
        localStorage.setItem('mapdev_bookmarks', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter & sort assets
  const filteredAssets = useMemo(() => {
    let result = [...ASSETS_DATA];

    if (selectedCategory !== 'all') {
      result = result.filter((a) => a.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.subcategory.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q)) ||
          a.creator.name.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'popular') {
      result.sort((a, b) => b.stats.favorites - a.stats.favorites);
    } else if (sortBy === 'downloads') {
      result.sort((a, b) => b.stats.downloads - a.stats.downloads);
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return result;
  }, [searchQuery, selectedCategory, sortBy]);

  const bookmarkedAssets = useMemo(() => {
    return ASSETS_DATA.filter((a) => bookmarkedIds.includes(a.id));
  }, [bookmarkedIds]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-white/20 bg-zinc-900/95 px-4 py-3 text-xs font-medium text-white shadow-2xl backdrop-blur-md animate-fade-in">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        onOpenSubmit={() => setIsSubmitOpen(true)}
        onOpenBookmarks={() => setIsBookmarksOpen(true)}
        bookmarksCount={bookmarkedIds.length}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        onSearchFocus={() => searchInputRef.current?.focus()}
      />

      {/* Hero Header & Search */}
      <Hero
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        searchInputRef={searchInputRef}
        totalAssets={ASSETS_DATA.length}
      />

      {/* Asset Catalog Section */}
      <section id="assets" className="flex-1 py-12 border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Catalog Controls Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight uppercase">
                {selectedCategory === 'all' ? 'All Free Developer Assets' : `${selectedCategory.toUpperCase()} Assets`}
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Showing {filteredAssets.length} verified community resources ready for Roblox Studio.
              </p>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-500">Sort by:</span>
              <div className="flex rounded-xl border border-border bg-surface p-1 text-xs">
                {(['popular', 'downloads', 'newest'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSortBy(mode)}
                    className={`rounded-lg px-3 py-1 font-mono uppercase text-[11px] transition-colors ${
                      sortBy === mode
                        ? 'bg-white text-black font-bold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Asset Grid */}
          {filteredAssets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface/40 py-16 text-center">
              <Box className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No assets matched your search</h3>
              <p className="mt-1 text-xs text-zinc-400 max-w-md mx-auto">
                Try searching with different keywords like &quot;lighting&quot;, &quot;door&quot;, &quot;pine&quot;, or clear the active category filter.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-4 rounded-lg bg-white px-4 py-2 text-xs font-bold text-black hover:bg-zinc-200"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onSelect={setSelectedAsset}
                  isBookmarked={bookmarkedIds.includes(asset.id)}
                  onToggleBookmark={toggleBookmark}
                />
              ))}
            </div>
          )}

        </div>
      </section>

      {/* Interactive Developer Tools Section */}
      <DevToolsSection />

      {/* Modals */}
      <AssetModal
        asset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
        isBookmarked={selectedAsset ? bookmarkedIds.includes(selectedAsset.id) : false}
        onToggleBookmark={toggleBookmark}
      />

      <SubmitModal
        isOpen={isSubmitOpen}
        onClose={() => setIsSubmitOpen(false)}
      />

      <BookmarksModal
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        bookmarkedAssets={bookmarkedAssets}
        onRemoveBookmark={toggleBookmark}
        onSelectAsset={setSelectedAsset}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
