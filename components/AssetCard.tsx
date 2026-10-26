'use client';

import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  ExternalLink, 
  Heart, 
  Eye, 
  Download, 
  FileCode, 
  Sparkles,
  Layers
} from 'lucide-react';
import { Asset } from '@/types';

interface AssetCardProps {
  asset: Asset;
  onSelect: (asset: Asset) => void;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({
  asset,
  onSelect,
  isBookmarked,
  onToggleBookmark,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyAssetId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (asset.robloxAssetId) {
      navigator.clipboard.writeText(asset.robloxAssetId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else if (asset.luauCode) {
      navigator.clipboard.writeText(asset.luauCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      onClick={() => onSelect(asset)}
      className="group relative flex flex-col justify-between rounded-xl border border-border bg-surface p-4 transition-all duration-200 hover:border-zinc-500 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
    >
      <div>
        {/* Thumbnail with Overlay Badges */}
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-900 border border-zinc-800">
          <img
            src={asset.thumbnail}
            alt={asset.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              // fallback
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

          {/* Top Badges */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            <span className="rounded bg-black/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider text-white border border-white/10 uppercase">
              {asset.format}
            </span>
            <span className="rounded bg-zinc-900/90 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-mono text-zinc-300 border border-zinc-700">
              {asset.subcategory}
            </span>
          </div>

          {/* Favorite Bookmark Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark(asset.id);
            }}
            className={`absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-md transition-colors ${
              isBookmarked
                ? 'bg-red-500/90 text-white'
                : 'bg-black/60 text-zinc-300 hover:text-white hover:bg-black/80'
            }`}
            title={isBookmarked ? 'Remove Bookmark' : 'Save Bookmark'}
          >
            <Heart className={`h-3.5 w-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>

          {/* Bottom stats overlay */}
          <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] font-mono text-zinc-300">
            <span>by {asset.creator.name}</span>
            <span>{asset.fileSize}</span>
          </div>
        </div>

        {/* Title and Short Description */}
        <div className="mt-3.5">
          <h3 className="text-sm font-semibold text-white group-hover:text-zinc-100 line-clamp-1">
            {asset.title}
          </h3>
          <p className="mt-1 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
            {asset.description}
          </p>
        </div>

        {/* Tags */}
        <div className="mt-3 flex flex-wrap gap-1">
          {asset.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded bg-zinc-900/90 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 border border-zinc-800"
            >
              #{tag}
            </span>
          ))}
          {asset.tags.length > 3 && (
            <span className="text-[10px] font-mono text-zinc-500 py-0.5">
              +{asset.tags.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="mt-4 pt-3 border-t border-border/80 flex items-center justify-between gap-2">
        {asset.robloxAssetId ? (
          <button
            onClick={handleCopyAssetId}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-zinc-900/90 py-1.5 px-2 text-xs font-mono text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
            title="Copy Roblox Asset ID"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-[11px] text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 text-zinc-400" />
                <span className="text-[11px] truncate">ID: {asset.robloxAssetId}</span>
              </>
            )}
          </button>
        ) : asset.luauCode ? (
          <button
            onClick={handleCopyAssetId}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-zinc-900/90 py-1.5 px-2 text-xs font-mono text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
            title="Copy Luau Code"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-[11px] text-emerald-400 font-semibold">Code Copied!</span>
              </>
            ) : (
              <>
                <FileCode className="h-3 w-3 text-zinc-400" />
                <span className="text-[11px]">Copy Script</span>
              </>
            )}
          </button>
        ) : (
          <div className="flex-1 text-[11px] font-mono text-zinc-500 py-1.5">Free Asset</div>
        )}

        {/* View Details Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(asset);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-zinc-800 text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
          title="Inspect Details"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
