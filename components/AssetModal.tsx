'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  Heart, 
  ShieldCheck, 
  Calendar, 
  HardDrive, 
  Tag, 
  FileCode,
  Share2
} from 'lucide-react';
import { Asset } from '@/types';
import { DISCORD_PREMIUM_CONTACT_URL } from '@/lib/discord';

interface AssetModalProps {
  asset: Asset | null;
  onClose: () => void;
  isBookmarked: boolean;
  hasPremiumAccess: boolean;
  onToggleBookmark: (id: string) => void;
  onDownload?: (assetId: string) => void;
}

export const AssetModal: React.FC<AssetModalProps> = ({
  asset,
  onClose,
  isBookmarked,
  hasPremiumAccess,
  onToggleBookmark,
  onDownload,
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!asset) return null;

  const handleCopyId = () => {
    const assetId = asset.robloxAssetId;
    if (assetId) {
      navigator.clipboard.writeText(assetId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleCopyCode = () => {
    const code = asset.luauCode;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />

      <div className="relative w-full max-w-3xl rounded-2xl border border-zinc-700 bg-surface p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-mono font-bold uppercase text-white border border-white/20">
              {asset.format}
            </span>
            <span className="text-xs font-mono text-zinc-400">
              {asset.subcategory}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleBookmark(asset.id)}
              className={`p-2 rounded-lg border border-border transition-colors ${
                isBookmarked ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
              title="Bookmark"
            >
              <Heart className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={handleShare}
              className="p-2 rounded-lg border border-border bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
              title="Share Link"
            >
              {copiedShare ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg border border-border bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Image & Quick Actions */}
          <div className="space-y-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
              <img
                src={asset.thumbnail}
                alt={asset.title}
                className="h-full w-full object-cover"
              />
            </div>

            {/* Quick Action Buttons */}
            <div className="space-y-2">
              {asset.isPremium && !hasPremiumAccess && (
                <a
                  href={DISCORD_PREMIUM_CONTACT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-xl border border-amber-400/40 bg-amber-400/10 text-amber-100 font-bold py-2.5 px-4 text-xs hover:bg-amber-400/20 transition-colors"
                >
                  ADD PREMIUM
                </a>
              )}

              {(!asset.isPremium || hasPremiumAccess) && asset.robloxAssetId && (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-zinc-900/90 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-mono text-zinc-500">ROBLOX ASSET ID</p>
                    <p className="font-mono text-sm font-semibold text-white truncate">{asset.robloxAssetId}</p>
                  </div>
                  <button
                    onClick={handleCopyId}
                    className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-zinc-200 transition-all"
                  >
                    {copiedId ? <Check className="h-3.5 w-3.5 text-black" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedId ? 'Copied' : 'Copy ID'}</span>
                  </button>
                </div>
              )}

              {(!asset.isPremium || hasPremiumAccess) && asset.fileData ? (
                <a
                  href={asset.fileData}
                  download={asset.fileName || `${asset.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.${asset.format === 'RBXM' ? 'rbxm' : 'zip'}`}
                  onClick={() => onDownload?.(asset.id)}
                  className="flex items-center justify-center gap-2 w-full rounded-xl border border-white bg-white text-black font-bold py-2.5 px-4 text-xs hover:bg-zinc-200 transition-colors shadow-lg cursor-pointer"
                >
                  <Download className="h-4 w-4 text-black" />
                  <span>Download File Langsung ({asset.fileName || asset.fileSize})</span>
                </a>
              ) : (!asset.isPremium || hasPremiumAccess) && asset.downloadUrl ? (
                <a
                  href={asset.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onDownload?.(asset.id)}
                  className="flex items-center justify-center gap-2 w-full rounded-xl border border-border bg-white text-black font-semibold py-2.5 px-4 text-xs hover:bg-zinc-200 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Resource File ({asset.fileSize})</span>
                </a>
              ) : null}
            </div>

            {/* Creator Info */}
            <div className="rounded-xl border border-border bg-surface/50 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center font-mono font-bold text-xs text-white border border-zinc-700">
                  {asset.creator.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-white">{asset.creator.name}</span>
                    {asset.creator.verified && (
                      <span title="Verified Creator" className="flex items-center">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">Asset Contributor</span>
                </div>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">{asset.license}</span>
            </div>
          </div>

          {/* Right Column: Title, Description, Code */}
          <div className="space-y-4 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">{asset.title}</h2>
              <p className="mt-2 text-xs text-zinc-400 leading-relaxed">{asset.description}</p>

              {/* Tags */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {asset.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded bg-zinc-900 px-2 py-0.5 text-[11px] font-mono text-zinc-300 border border-zinc-800"
                  >
                    <Tag className="h-2.5 w-2.5 text-zinc-500" />
                    {tag}
                  </span>
                ))}
              </div>

              {/* Code Snippet Box if available */}
              {(!asset.isPremium || hasPremiumAccess) && asset.luauCode && (
                <div className="mt-4">
                  <div className="flex items-center justify-between rounded-t-lg border border-border bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400">
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <FileCode className="h-3.5 w-3.5 text-zinc-300" />
                      <span>Luau Implementation</span>
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-1 text-[11px] font-mono text-zinc-300 hover:text-white"
                    >
                      {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedCode ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="max-h-48 overflow-y-auto rounded-b-lg border-x border-b border-border bg-black/80 p-3 font-mono text-[11px] text-zinc-300 leading-relaxed">
                    <code>{asset.luauCode}</code>
                  </pre>
                </div>
              )}
            </div>

            {/* Asset Metadata Row */}
            <div className="pt-4 border-t border-border grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-zinc-900/60 p-2 border border-zinc-800/80">
                <span className="block text-[10px] font-mono text-zinc-500">DOWNLOADS</span>
                <span className="font-mono font-bold text-white">{asset.stats.downloads.toLocaleString()}</span>
              </div>
              <div className="rounded-lg bg-zinc-900/60 p-2 border border-zinc-800/80">
                <span className="block text-[10px] font-mono text-zinc-500">FAVORITES</span>
                <span className="font-mono font-bold text-white">{asset.stats.favorites.toLocaleString()}</span>
              </div>
              <div className="rounded-lg bg-zinc-900/60 p-2 border border-zinc-800/80">
                <span className="block text-[10px] font-mono text-zinc-500">LAST UPDATED</span>
                <span className="font-mono font-bold text-white">{asset.updatedAt}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
