'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { AssetCard } from '@/components/AssetCard';
import { AssetModal } from '@/components/AssetModal';
import { DevToolsSection } from '@/components/DevToolsSection';
import { BookmarksModal } from '@/components/BookmarksModal';
import { DiscordAuthModal, DiscordUser } from '@/components/DiscordAuthModal';
import { Footer } from '@/components/Footer';
import { ASSETS_DATA } from '@/lib/data';
import { Asset, AssetCategory } from '@/types';
import { SlidersHorizontal, Sparkles, Box, CheckCircle } from 'lucide-react';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'downloads'>('popular');
  const [assetsList, setAssetsList] = useState<Asset[]>(ASSETS_DATA);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('assets');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Discord Authorization State
  const [discordUser, setDiscordUser] = useState<DiscordUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isDiscordModalOpen, setIsDiscordModalOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load Discord user session strictly (Zero access without Discord)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const discordUserParam = urlParams.get('discord_user');
      const discordError = urlParams.get('discord_error');

      if (discordUserParam) {
        try {
          const parsed = JSON.parse(decodeURIComponent(discordUserParam));
          if (parsed && parsed.isAuthorized) {
            setDiscordUser(parsed);
            localStorage.setItem('mapdev_discord_user', JSON.stringify(parsed));
            window.history.replaceState({}, '', '/');
            setIsAuthChecking(false);
            return;
          }
        } catch (e) {}
      }

      if (discordError) {
        window.history.replaceState({}, '', '/');
      }

      const savedUser = localStorage.getItem('mapdev_discord_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed && parsed.isAuthorized) {
            setDiscordUser(parsed);
            setIsAuthChecking(false);
            return;
          }
        } catch (e) {}
      }
    } catch (e) {
      console.error('Error loading discord session:', e);
    } finally {
      setIsAuthChecking(false);
    }
  }, []);

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

  // Save bookmarks & update favorites real-time
  const toggleBookmark = (id: string) => {
    const isCurrentlyBookmarked = bookmarkedIds.includes(id);

    setBookmarkedIds((prev) => {
      let next: string[];
      if (prev.includes(id)) {
        next = prev.filter((item) => item !== id);
        showToast('Asset dihapus dari bookmark');
      } else {
        next = [...prev, id];
        showToast('Asset disimpan ke bookmark!');
      }
      try {
        localStorage.setItem('mapdev_bookmarks', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });

    // Update favorites count on assetsList
    setAssetsList((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          const currentFavs = item.stats?.favorites || 0;
          const nextFavs = isCurrentlyBookmarked ? Math.max(0, currentFavs - 1) : currentFavs + 1;
          return {
            ...item,
            stats: {
              ...item.stats,
              favorites: nextFavs,
            },
          };
        }
        return item;
      });

      try {
        localStorage.setItem('mapdev_saved_products', JSON.stringify(updated));
      } catch (e) {}

      return updated;
    });

    // Also update selectedAsset in modal immediately
    setSelectedAsset((curr) => {
      if (curr && curr.id === id) {
        const currentFavs = curr.stats?.favorites || 0;
        const nextFavs = isCurrentlyBookmarked ? Math.max(0, currentFavs - 1) : currentFavs + 1;
        return {
          ...curr,
          stats: {
            ...curr.stats,
            favorites: nextFavs,
          },
        };
      }
      return curr;
    });

    // Background sync to backend & GitHub
    try {
      fetch('/api/assets/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: isCurrentlyBookmarked ? 'unlike' : 'like' }),
      }).catch(() => {});
    } catch (e) {}
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

  // Load live assets from backend API + instant sync
  useEffect(() => {
    const deletedIds: string[] = (() => {
      try {
        return JSON.parse(localStorage.getItem('mapdev_deleted_ids') || '[]');
      } catch {
        return [];
      }
    })();

    // 1. Instant load from local storage if available
    try {
      const local = localStorage.getItem('mapdev_saved_products');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAssetsList(parsed.filter((a: Asset) => !deletedIds.includes(a.id)));
        }
      }
    } catch (e) {}

    // 2. Fetch live data from backend (with safe fallback to localStorage & direct GitHub CDN)
    async function fetchLiveAssets() {
      try {
        let serverProducts: Asset[] = [];
        try {
          const res = await fetch('/api/assets?t=' + Date.now(), { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.data) && json.data.length > 0) {
              serverProducts = json.data;
            }
          }
        } catch (e) {}

        // Fallback directly to GitHub Raw CDN if /api/assets was empty or delayed
        if (serverProducts.length === 0) {
          try {
            const ghRes = await fetch('https://raw.githubusercontent.com/QuantumHub-QH/mchlern/main/data/products.json?t=' + Date.now(), { cache: 'no-store' });
            if (ghRes.ok) {
              const ghJson = await ghRes.json();
              if (Array.isArray(ghJson) && ghJson.length > 0) {
                serverProducts = ghJson;
              }
            }
          } catch (e) {}
        }

        if (serverProducts.length > 0) {
          const cleanData = serverProducts.filter((a: Asset) => !deletedIds.includes(a.id));
          if (cleanData.length > 0) {
            // Read local saved products to retain any download count or un-synced product
            let localCache: Asset[] = [];
            try {
              const localRaw = localStorage.getItem('mapdev_saved_products');
              if (localRaw) localCache = JSON.parse(localRaw);
            } catch (e) {}

            // Merge server data with local download counts so downloads NEVER reset to 0
            const merged = cleanData.map((item: Asset) => {
              const trackedDl = parseInt(localStorage.getItem(`mapdev_dl_${item.id}`) || '0', 10);
              const localItem = localCache.find((lc) => lc.id === item.id);
              const localDl = localItem?.stats?.downloads || 0;
              const serverDl = item.stats?.downloads || 0;
              const maxDl = Math.max(trackedDl, localDl, serverDl);

              return {
                ...item,
                stats: {
                  ...item.stats,
                  downloads: maxDl,
                },
              };
            });

            // Also keep any local products not yet in server
            for (const lp of localCache) {
              if (lp && lp.id && !deletedIds.includes(lp.id) && !merged.some((m: Asset) => m.id === lp.id)) {
                merged.push(lp);
              }
            }

            setAssetsList(merged);
            localStorage.setItem('mapdev_saved_products', JSON.stringify(merged));
            return;
          }
        }
        
        // If /api/assets returned empty, keep local storage so products don't disappear on refresh
        const local = localStorage.getItem('mapdev_saved_products');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAssetsList(parsed.filter((a: Asset) => !deletedIds.includes(a.id)));
          }
        }
      } catch (err) {
        console.error('Failed to fetch live assets:', err);
      }
    }
    fetchLiveAssets();
  }, []);

  // Real-time download handler
  const handleDownload = (assetId: string) => {
    // 1. Increment in standalone local storage key so it NEVER resets on redeploy or refresh
    const currentTracked = parseInt(localStorage.getItem(`mapdev_dl_${assetId}`) || '0', 10);
    const newTracked = currentTracked + 1;
    localStorage.setItem(`mapdev_dl_${assetId}`, newTracked.toString());

    // 2. Update UI list
    setAssetsList((prev) => {
      const next = prev.map((item) => {
        if (item.id === assetId) {
          const currentDownloads = item.stats?.downloads || 0;
          const best = Math.max(currentDownloads + 1, newTracked);
          return {
            ...item,
            stats: {
              ...item.stats,
              downloads: best,
            },
          };
        }
        return item;
      });

      try {
        localStorage.setItem('mapdev_saved_products', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }

      return next;
    });

    // 3. Background persistent sync to backend & GitHub
    try {
      fetch('/api/assets/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: assetId }),
      }).catch((err) => console.error('Download sync err:', err));
    } catch (e) {}

    showToast('Download started! Total unduhan diperbarui.');
  };

  // Total real-time downloads across all assets
  const totalDownloads = useMemo(() => {
    return assetsList.reduce((acc, curr) => acc + (curr.stats?.downloads || 0), 0);
  }, [assetsList]);

  // Filter & sort assets
  const filteredAssets = useMemo(() => {
    let result = [...assetsList];

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
          (a.tags && a.tags.some((t) => t.toLowerCase().includes(q))) ||
          (a.creator && a.creator.name.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'popular') {
      result.sort((a, b) => (b.stats?.favorites || 0) - (a.stats?.favorites || 0));
    } else if (sortBy === 'downloads') {
      result.sort((a, b) => (b.stats?.downloads || 0) - (a.stats?.downloads || 0));
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return result;
  }, [searchQuery, selectedCategory, sortBy, assetsList]);

  const bookmarkedAssets = useMemo(() => {
    return assetsList.filter((a) => bookmarkedIds.includes(a.id));
  }, [bookmarkedIds, assetsList]);

  // Strict Auth Gate: Loading Screen while verifying session
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#08080a] flex flex-col items-center justify-center p-4 text-center">
        <div className="h-10 w-10 border-2 border-[#5865F2] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono text-zinc-400 tracking-wider uppercase">Memverifikasi Otorisasi Discord...</p>
      </div>
    );
  }

  // Strict Auth Gate: Zero access if not authorized or logged out
  if (!discordUser || !discordUser.isAuthorized) {
    return (
      <DiscordAuthModal
        isOpen={true}
        onClose={() => {}}
        onAuthorize={(user) => {
          setDiscordUser(user);
        }}
      />
    );
  }

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
        onOpenBookmarks={() => setIsBookmarksOpen(true)}
        bookmarksCount={bookmarkedIds.length}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        onSearchFocus={() => searchInputRef.current?.focus()}
        discordUser={discordUser}
        onOpenDiscordAuth={() => setIsDiscordModalOpen(true)}
        onLogoutDiscord={() => {
          localStorage.removeItem('mapdev_discord_user');
          setDiscordUser(null);
          showToast('Discord session disconnected');
        }}
      />

      {/* Hero Header & Search */}
      <Hero
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        searchInputRef={searchInputRef}
        totalAssets={assetsList.length}
        totalDownloads={totalDownloads}
      />

      {/* Asset Catalog Section */}
      <section id="assets" className="flex-1 py-12 border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Catalog Controls Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight uppercase">
                {selectedCategory === 'all' ? 'All Free Developer Assets' : `${selectedCategory.replace(/-/g, ' ').toUpperCase()} Assets`}
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
            assetsList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 bg-[#101014]/60 py-20 px-4 text-center">
                <div className="h-14 w-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-400">
                  <Box className="h-7 w-7 text-zinc-500" />
                </div>
                <h3 className="text-lg font-bold text-white uppercase font-mono tracking-wide">
                  Belum Ada Produk / Aset
                </h3>
                <p className="mt-1.5 text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                  Katalog produk sedang dalam pembaruan. Silakan cek kembali nanti.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-surface/40 py-16 text-center">
                <Box className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-white">Tidak ada produk yang cocok</h3>
                <p className="mt-1 text-xs text-zinc-400 max-w-md mx-auto">
                  Coba kata kunci lain atau reset filter kategori yang aktif.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="mt-4 rounded-lg bg-white px-4 py-2 text-xs font-bold text-black hover:bg-zinc-200"
                >
                  Reset Filter
                </button>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onSelect={setSelectedAsset}
                  isBookmarked={bookmarkedIds.includes(asset.id)}
                  onToggleBookmark={toggleBookmark}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          )}

        </div>
      </section>

      {/* Interactive Developer Tools Section */}
      <DevToolsSection 
        discordUser={discordUser} 
        onOpenDiscordAuth={() => setIsDiscordModalOpen(true)} 
      />

      {/* Modals */}
      <AssetModal
        asset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
        isBookmarked={selectedAsset ? bookmarkedIds.includes(selectedAsset.id) : false}
        onToggleBookmark={toggleBookmark}
        onDownload={handleDownload}
      />

      <BookmarksModal
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        bookmarkedAssets={bookmarkedAssets}
        onRemoveBookmark={toggleBookmark}
        onSelectAsset={setSelectedAsset}
      />

      {/* Discord Authorization Modal */}
      <DiscordAuthModal
        isOpen={isDiscordModalOpen}
        onClose={() => setIsDiscordModalOpen(false)}
        onAuthorize={(user) => {
          setDiscordUser(user);
          showToast(`Welcome, @${user.username}! Discord connected.`);
        }}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
