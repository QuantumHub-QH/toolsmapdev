'use client';

import React from 'react';
import { X, Trash2, ExternalLink, Bookmark, Box } from 'lucide-react';
import { Asset } from '@/types';

interface BookmarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarkedAssets: Asset[];
  onRemoveBookmark: (id: string) => void;
  onSelectAsset: (asset: Asset) => void;
}

export const BookmarksModal: React.FC<BookmarksModalProps> = ({
  isOpen,
  onClose,
  bookmarkedAssets,
  onRemoveBookmark,
  onSelectAsset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-xl rounded-2xl border border-zinc-700 bg-surface p-6 shadow-2xl z-10 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-white" />
            <h3 className="text-base font-bold text-white uppercase">Saved Bookmarks</h3>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-mono text-zinc-300">
              {bookmarkedAssets.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-border p-1.5 text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {bookmarkedAssets.length === 0 ? (
            <div className="py-12 text-center">
              <Box className="h-10 w-10 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-zinc-400">No saved bookmarks yet</p>
              <p className="text-xs text-zinc-500 mt-1">
                Click the heart icon on any asset to save it to your local workspace collection.
              </p>
            </div>
          ) : (
            bookmarkedAssets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-black/40 p-3 hover:border-zinc-600 transition-colors"
              >
                <div
                  className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  onClick={() => {
                    onSelectAsset(asset);
                    onClose();
                  }}
                >
                  <img
                    src={asset.thumbnail}
                    alt={asset.title}
                    className="h-12 w-12 rounded-lg object-cover shrink-0 border border-zinc-800"
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-white truncate hover:underline">
                      {asset.title}
                    </h4>
                    <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">
                      {asset.format} • {asset.subcategory}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onRemoveBookmark(asset.id)}
                  className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Remove from bookmarks"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-border bg-zinc-900 px-4 py-2 text-xs font-mono text-zinc-300 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
