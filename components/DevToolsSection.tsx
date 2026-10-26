'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Music, 
  Image as ImageIcon, 
  Upload, 
  Check, 
  Copy, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Key, 
  User, 
  LogOut, 
  ExternalLink, 
  FileAudio, 
  Play, 
  Pause,
  Download,
  Code2,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';

interface RobloxSession {
  apiKey: string;
  userId: string;
  name: string;
  displayName: string;
  avatarUrl: string;
}

interface UploadQueueItem {
  id: string;
  file: File;
  name: string;
  size: string;
  type: 'Audio' | 'Decal';
  previewUrl: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  assetId?: string;
  errorMessage?: string;
}

export const DevToolsSection: React.FC = () => {
  // Active tool tab: Audio or Image (DIPISAH)
  const [activeTool, setActiveTool] = useState<'audio' | 'image'>('audio');

  // Roblox Account Connection State
  const [robloxSession, setRobloxSession] = useState<RobloxSession | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [userIdInput, setUserIdInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Upload Queues for Audio and Image (Separated)
  const [audioQueue, setAudioQueue] = useState<UploadQueueItem[]>([]);
  const [imageQueue, setImageQueue] = useState<UploadQueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Audio Playback state for preview
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Load saved Roblox session on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('roblox_cloud_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.userId && parsed.apiKey) {
          setRobloxSession(parsed);
        }
      }
    } catch (e) {
      console.error('Error loading roblox session:', e);
    }
  }, []);

  // Connect Roblox Account handler
  const handleConnectRoblox = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    setConnectError(null);

    const key = apiKeyInput.trim();
    const uid = userIdInput.trim();

    if (!key || !uid) {
      setConnectError('Harap masukkan Roblox API Key dan User ID Roblox.');
      setConnecting(false);
      return;
    }

    try {
      const res = await fetch(`/api/roblox/user-info?userId=${encodeURIComponent(uid)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setConnectError(data.error || 'User ID Roblox tidak valid atau tidak ditemukan.');
        setConnecting(false);
        return;
      }

      const session: RobloxSession = {
        apiKey: key,
        userId: data.user.id,
        name: data.user.name,
        displayName: data.user.displayName,
        avatarUrl: data.user.avatarUrl,
      };

      setRobloxSession(session);
      localStorage.setItem('roblox_cloud_session', JSON.stringify(session));
      setApiKeyInput('');
      setUserIdInput('');
    } catch (err: any) {
      setConnectError(err.message || 'Gagal menghubungi server untuk memvalidasi akun.');
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect Roblox Account
  const handleDisconnect = () => {
    if (confirm('Yakin ingin memutuskan koneksi akun Roblox ini?')) {
      localStorage.removeItem('roblox_cloud_session');
      setRobloxSession(null);
    }
  };

  // Add files to Audio Queue (Max 100)
  const handleAudioFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (audioQueue.length + files.length > 100) {
      alert(`Maksimal 100 file sekaligus! Saat ini sudah ada ${audioQueue.length} file di antrian.`);
    }

    const availableSlots = 100 - audioQueue.length;
    const allowedFiles = files.slice(0, availableSlots);

    const newItems: UploadQueueItem[] = allowedFiles.map((file, idx) => ({
      id: `audio-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      file,
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      type: 'Audio',
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
    }));

    setAudioQueue((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  // Add files to Image Queue (Max 100)
  const handleImageFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (imageQueue.length + files.length > 100) {
      alert(`Maksimal 100 file sekaligus! Saat ini sudah ada ${imageQueue.length} file di antrian.`);
    }

    const availableSlots = 100 - imageQueue.length;
    const allowedFiles = files.slice(0, availableSlots);

    const newItems: UploadQueueItem[] = allowedFiles.map((file, idx) => ({
      id: `image-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      file,
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      type: 'Decal',
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
    }));

    setImageQueue((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  // Remove single item from queue
  const removeQueueItem = (type: 'audio' | 'image', id: string) => {
    if (type === 'audio') {
      setAudioQueue((prev) => prev.filter((item) => item.id !== id));
      if (playingAudioId === id && audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        setPlayingAudioId(null);
      }
    } else {
      setImageQueue((prev) => prev.filter((item) => item.id !== id));
    }
  };

  // Clear entire queue
  const clearQueue = (type: 'audio' | 'image') => {
    if (type === 'audio') {
      setAudioQueue([]);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        setPlayingAudioId(null);
      }
    } else {
      setImageQueue([]);
    }
  };

  // Audio Play / Pause preview toggle
  const togglePlayAudio = (id: string, url: string) => {
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio();
    }
    const audio = audioPlayerRef.current;

    if (playingAudioId === id) {
      audio.pause();
      setPlayingAudioId(null);
    } else {
      audio.src = url;
      audio.play().catch(() => {});
      setPlayingAudioId(id);
      audio.onended = () => setPlayingAudioId(null);
    }
  };

  // Start Bulk Uploading to Roblox Open Cloud
  const handleStartBulkUpload = async (type: 'audio' | 'image') => {
    if (!robloxSession) {
      alert('Silakan hubungkan akun Roblox terlebih dahulu dengan API Key & User ID!');
      return;
    }

    const currentQueue = type === 'audio' ? audioQueue : imageQueue;
    const pendingItems = currentQueue.filter((item) => item.status === 'pending' || item.status === 'error');

    if (pendingItems.length === 0) {
      alert('Tidak ada file baru untuk di-upload.');
      return;
    }

    setIsUploading(true);
    setUploadProgress({ current: 0, total: pendingItems.length });

    const setQueue = type === 'audio' ? setAudioQueue : setImageQueue;

    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];
      setUploadProgress({ current: i + 1, total: pendingItems.length });

      // Update state to uploading
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading' } : q))
      );

      try {
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('assetType', type === 'audio' ? 'Audio' : 'Decal');
        formData.append('displayName', item.name.replace(/\.[^/.]+$/, ''));
        formData.append('apiKey', robloxSession.apiKey);
        formData.append('userId', robloxSession.userId);

        const res = await fetch('/api/roblox/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await res.json();

        if (res.ok && result.success && result.assetId) {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? { ...q, status: 'success', assetId: String(result.assetId) }
                : q
            )
          );
        } else {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? {
                    ...q,
                    status: 'error',
                    errorMessage: result.error || 'Gagal mengupload ke Roblox',
                  }
                : q
            )
          );
        }
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: 'error', errorMessage: err.message || 'Network error' }
              : q
          )
        );
      }

      // Small delay between uploads to respect Roblox rate limits
      await new Promise((r) => setTimeout(r, 400));
    }

    setIsUploading(false);
  };

  // Copy single Asset ID
  const handleCopyAssetId = (assetId: string) => {
    navigator.clipboard.writeText(assetId);
    setCopiedId(assetId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Copy All Asset IDs (as plain list or Luau Array)
  const handleCopyAllIds = (type: 'audio' | 'image', asLuauArray: boolean = false) => {
    const queue = type === 'audio' ? audioQueue : imageQueue;
    const successfulIds = queue
      .filter((q) => q.status === 'success' && q.assetId)
      .map((q) => q.assetId);

    if (successfulIds.length === 0) {
      alert('Belum ada Asset ID yang berhasil di-upload.');
      return;
    }

    let textToCopy = '';
    if (asLuauArray) {
      textToCopy = `-- Roblox ${type === 'audio' ? 'Audio' : 'Decal'} Asset IDs\nreturn {\n  ${successfulIds.map((id) => `"${id}"`).join(',\n  ')}\n}`;
    } else {
      textToCopy = successfulIds.join(', ');
    }

    navigator.clipboard.writeText(textToCopy);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  // Download log report (.txt)
  const handleDownloadLog = (type: 'audio' | 'image') => {
    const queue = type === 'audio' ? audioQueue : imageQueue;
    if (queue.length === 0) return;

    let content = `=== ROBLOX ${type.toUpperCase()} BULK UPLOAD REPORT ===\n`;
    content += `Account: ${robloxSession ? `${robloxSession.displayName} (@${robloxSession.name}) - ID: ${robloxSession.userId}` : 'Unconnected'}\n`;
    content += `Date: ${new Date().toLocaleString()}\n`;
    content += `Total Files: ${queue.length}\n\n`;

    queue.forEach((q, idx) => {
      content += `[${idx + 1}] File: ${q.name}\n`;
      content += `    Status: ${q.status.toUpperCase()}\n`;
      if (q.assetId) content += `    Roblox Asset ID: ${q.assetId}\n`;
      if (q.errorMessage) content += `    Error: ${q.errorMessage}\n`;
      content += `\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roblox-${type}-bulk-upload-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeQueue = activeTool === 'audio' ? audioQueue : imageQueue;
  const successCount = activeQueue.filter((q) => q.status === 'success').length;
  const errorCount = activeQueue.filter((q) => q.status === 'error').length;

  return (
    <section id="tools" className="py-16 border-b border-border bg-[#09090c] text-foreground relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-mono text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span>ROBLOX OPEN CLOUD AUTOMATION</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white uppercase font-mono">
            Roblox Bulk <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">Uploader Tools</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Upload hingga <strong>100 audio</strong> atau <strong>100 gambar/decal</strong> sekaligus langsung ke akun Roblox Studio kamu menggunakan Roblox Open Cloud API resmi.
          </p>
        </div>

        {/* 1. ROBLOX ACCOUNT CONNECTION SECTION */}
        <div className="rounded-2xl border border-zinc-800 bg-[#101014] p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

          {robloxSession ? (
            /* CONNECTED: PROFIL ROBLOX AVATAR, USERNAME, DISPLAYNAME (FORM INPUT HILANG) */
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={robloxSession.avatarUrl}
                    alt={robloxSession.displayName}
                    className="h-16 w-16 rounded-full border-2 border-emerald-400/80 bg-zinc-900 object-cover shadow-lg"
                  />
                  <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-500 border-2 border-[#101014]" title="Connected" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white font-mono leading-tight">
                      {robloxSession.displayName}
                    </h3>
                    <span className="rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono px-2 py-0.5">
                      Roblox Verified
                    </span>
                  </div>

                  <p className="text-xs font-mono text-zinc-400 mt-0.5">
                    @{robloxSession.name} • <span className="text-zinc-500">ID: {robloxSession.userId}</span>
                  </p>

                  <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono text-blue-400">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                    <span>Open Cloud API Key Aktif (Siap Bulk Upload)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 text-xs font-mono text-red-400 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Ganti Akun / Disconnect</span>
                </button>
              </div>
            </div>
          ) : (
            /* NOT CONNECTED: FORM INPUT API KEY & USER ID */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-zinc-800">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase flex items-center gap-2">
                    <Key className="h-4 w-4 text-blue-400" />
                    <span>Hubungkan Akun Roblox (Open Cloud API)</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Masukkan API Key & User ID Roblox kamu untuk mulai bulk upload hingga 100 aset sekaligus.
                  </p>
                </div>

                <a
                  href="https://create.roblox.com/dashboard/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono text-blue-400 hover:text-blue-300 underline"
                >
                  <span>Buka Creator Dashboard (Buat API Key)</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {connectError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300 font-mono">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <span>{connectError}</span>
                </div>
              )}

              <form onSubmit={handleConnectRoblox} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                {/* API Key */}
                <div className="sm:col-span-6">
                  <label className="block text-xs font-mono text-zinc-300 mb-1">
                    1. Roblox Open Cloud API Key *
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      required
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="Paste Roblox API Key (Permissions: Assets read & write)"
                      className="w-full rounded-xl border border-zinc-700 bg-black py-2.5 pl-3.5 pr-10 text-xs text-white focus:border-blue-400 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 text-zinc-500 hover:text-zinc-300"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* User ID */}
                <div className="sm:col-span-3">
                  <label className="block text-xs font-mono text-zinc-300 mb-1">
                    2. Roblox User ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={userIdInput}
                    onChange={(e) => setUserIdInput(e.target.value)}
                    placeholder="e.g. 138947291"
                    className="w-full rounded-xl border border-zinc-700 bg-black py-2.5 px-3.5 text-xs text-white focus:border-blue-400 focus:outline-none font-mono"
                  />
                </div>

                {/* Submit Connect Button */}
                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    disabled={connecting}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 px-4 text-xs font-bold font-mono text-white transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${connecting ? 'animate-spin' : ''}`} />
                    <span>{connecting ? 'Menghubungkan...' : 'Konek Akun Roblox'}</span>
                  </button>
                </div>
              </form>

              <div className="rounded-lg bg-zinc-900/60 p-2.5 text-[11px] font-mono text-zinc-400 border border-zinc-800">
                💡 <strong>Cara buat API Key:</strong> Buka Creator Dashboard ➔ Credentials ➔ Create API Key ➔ Tambahkan permission <strong>Assets (Read & Write)</strong> ➔ Copy API Key dan paste di atas.
              </div>
            </div>
          )}
        </div>

        {/* 2. DEDICATED TOOLS NAVIGATION (DIPISAH: AUDIO vs IMAGE) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTool('audio')}
              className={`flex items-center gap-2.5 rounded-xl px-5 py-3 text-xs font-bold font-mono uppercase transition-all ${
                activeTool === 'audio'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-102 border border-blue-400'
                  : 'bg-surface border border-border text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              <Music className="h-4 w-4" />
              <span>1. Audio Uploader ({audioQueue.length}/100)</span>
            </button>

            <button
              onClick={() => setActiveTool('image')}
              className={`flex items-center gap-2.5 rounded-xl px-5 py-3 text-xs font-bold font-mono uppercase transition-all ${
                activeTool === 'image'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20 scale-102 border border-purple-400'
                  : 'bg-surface border border-border text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              <ImageIcon className="h-4 w-4" />
              <span>2. Image Uploader ({imageQueue.length}/100)</span>
            </button>
          </div>

          <div className="text-xs font-mono text-zinc-400">
            Tool Aktif: <strong className="text-white">{activeTool === 'audio' ? '🎵 ROBLOX AUDIO BULK UPLOADER' : '🖼️ ROBLOX IMAGE BULK UPLOADER'}</strong>
          </div>
        </div>

        {/* 3. TOOL CONTENT PANELS */}
        {activeTool === 'audio' ? (
          /* ============================================================== */
          /* 🎵 AUDIO UPLOADER VIEW (DIPISAH)                               */
          /* ============================================================== */
          <div className="space-y-6">
            {/* Upload Zone */}
            <div className="rounded-2xl border-2 border-dashed border-blue-500/40 bg-blue-500/5 p-8 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                id="bulk-audio-file-input"
                multiple
                accept=".mp3,.ogg"
                onChange={handleAudioFilesSelected}
                className="hidden"
              />
              <label htmlFor="bulk-audio-file-input" className="cursor-pointer block space-y-3">
                <div className="h-14 w-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
                  <FileAudio className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">
                    Pilih File Audio (.mp3, .ogg) — Hingga 100 File Sekaligus
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Drag & drop atau klik untuk memilih file audio dari komputer atau HP kamu.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/20 px-3.5 py-1 text-xs font-mono text-blue-300">
                  <span>Batch Capacity: {audioQueue.length} / 100 Audio</span>
                </div>
              </label>
            </div>

            {/* Audio Queue Management */}
            {audioQueue.length > 0 && (
              <div className="space-y-4">
                {/* Queue Control Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-zinc-800 bg-[#121217]">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-zinc-300 font-bold">
                      Antrian: {audioQueue.length} Audio
                    </span>
                    {successCount > 0 && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                        {successCount} Berhasil
                      </span>
                    )}
                    {errorCount > 0 && (
                      <span className="text-[10px] font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">
                        {errorCount} Gagal
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleStartBulkUpload('audio')}
                      disabled={isUploading || !robloxSession}
                      className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-mono font-bold text-white transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                      <Upload className={`h-3.5 w-3.5 ${isUploading ? 'animate-bounce' : ''}`} />
                      <span>{isUploading ? `Uploading (${uploadProgress.current}/${uploadProgress.total})...` : `Upload Semua Audio (${audioQueue.length})`}</span>
                    </button>

                    {successCount > 0 && (
                      <>
                        <button
                          onClick={() => handleCopyAllIds('audio', false)}
                          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-300 hover:text-white"
                          title="Copy list Asset IDs"
                        >
                          {copiedAll ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>Copy Semua ID</span>
                        </button>

                        <button
                          onClick={() => handleCopyAllIds('audio', true)}
                          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-300 hover:text-white"
                          title="Copy as Luau Script Table"
                        >
                          <Code2 className="h-3.5 w-3.5 text-blue-400" />
                          <span>Copy Luau Array</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleDownloadLog('audio')}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-300 hover:text-white"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Export Log</span>
                    </button>

                    <button
                      onClick={() => clearQueue('audio')}
                      disabled={isUploading}
                      className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-mono text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Bersihkan</span>
                    </button>
                  </div>
                </div>

                {/* Audio Items List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {audioQueue.map((item, idx) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-zinc-800 bg-[#101014] p-3.5 space-y-2 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            onClick={() => togglePlayAudio(item.id, item.previewUrl)}
                            className="h-8 w-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 hover:bg-blue-500 hover:text-white transition-colors"
                            title="Play/Pause Preview Audio"
                          >
                            {playingAudioId === item.id ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                          </button>
                          <div className="min-w-0">
                            <p className="text-xs font-mono font-bold text-white truncate" title={item.name}>
                              #{idx + 1} {item.name}
                            </p>
                            <span className="text-[10px] font-mono text-zinc-500">{item.size}</span>
                          </div>
                        </div>

                        {!isUploading && (
                          <button
                            onClick={() => removeQueueItem('audio', item.id)}
                            className="text-zinc-500 hover:text-red-400 p-1"
                            title="Hapus dari antrian"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Status / Result */}
                      <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs font-mono">
                        {item.status === 'pending' && (
                          <span className="text-zinc-400 text-[11px]">Siap di-upload</span>
                        )}
                        {item.status === 'uploading' && (
                          <span className="text-blue-400 text-[11px] flex items-center gap-1">
                            <RefreshCw className="h-3 w-3 animate-spin" /> Uploading...
                          </span>
                        )}
                        {item.status === 'success' && (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-emerald-400 text-[11px] font-bold">
                              ID: {item.assetId}
                            </span>
                            <button
                              onClick={() => handleCopyAssetId(item.assetId!)}
                              className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded flex items-center gap-1"
                            >
                              {copiedId === item.assetId ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                              <span>{copiedId === item.assetId ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        )}
                        {item.status === 'error' && (
                          <span className="text-red-400 text-[10px] truncate" title={item.errorMessage}>
                            Error: {item.errorMessage}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ============================================================== */
          /* 🖼️ IMAGE UPLOADER VIEW (DIPISAH)                               */
          /* ============================================================== */
          <div className="space-y-6">
            {/* Upload Zone */}
            <div className="rounded-2xl border-2 border-dashed border-purple-500/40 bg-purple-500/5 p-8 text-center hover:border-purple-500 transition-colors">
              <input
                type="file"
                id="bulk-image-file-input"
                multiple
                accept=".png,.jpg,.jpeg,.tga,.bmp"
                onChange={handleImageFilesSelected}
                className="hidden"
              />
              <label htmlFor="bulk-image-file-input" className="cursor-pointer block space-y-3">
                <div className="h-14 w-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400">
                  <ImageIcon className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">
                    Pilih File Gambar / Decal (.png, .jpg, .tga) — Hingga 100 File Sekaligus
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Drag & drop atau klik untuk memilih file gambar dari komputer atau HP kamu.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/20 px-3.5 py-1 text-xs font-mono text-purple-300">
                  <span>Batch Capacity: {imageQueue.length} / 100 Gambar</span>
                </div>
              </label>
            </div>

            {/* Image Queue Management */}
            {imageQueue.length > 0 && (
              <div className="space-y-4">
                {/* Queue Control Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-zinc-800 bg-[#121217]">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-zinc-300 font-bold">
                      Antrian: {imageQueue.length} Gambar
                    </span>
                    {successCount > 0 && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                        {successCount} Berhasil
                      </span>
                    )}
                    {errorCount > 0 && (
                      <span className="text-[10px] font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">
                        {errorCount} Gagal
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleStartBulkUpload('image')}
                      disabled={isUploading || !robloxSession}
                      className="flex items-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-mono font-bold text-white transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                      <Upload className={`h-3.5 w-3.5 ${isUploading ? 'animate-bounce' : ''}`} />
                      <span>{isUploading ? `Uploading (${uploadProgress.current}/${uploadProgress.total})...` : `Upload Semua Gambar (${imageQueue.length})`}</span>
                    </button>

                    {successCount > 0 && (
                      <>
                        <button
                          onClick={() => handleCopyAllIds('image', false)}
                          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-300 hover:text-white"
                          title="Copy list Asset IDs"
                        >
                          {copiedAll ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>Copy Semua ID</span>
                        </button>

                        <button
                          onClick={() => handleCopyAllIds('image', true)}
                          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-300 hover:text-white"
                          title="Copy as Luau Script Table"
                        >
                          <Code2 className="h-3.5 w-3.5 text-purple-400" />
                          <span>Copy Luau Array</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleDownloadLog('image')}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-300 hover:text-white"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Export Log</span>
                    </button>

                    <button
                      onClick={() => clearQueue('image')}
                      disabled={isUploading}
                      className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-mono text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Bersihkan</span>
                    </button>
                  </div>
                </div>

                {/* Image Grid with Thumbnails */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {imageQueue.map((item, idx) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-zinc-800 bg-[#101014] p-2.5 space-y-2 hover:border-zinc-700 transition-colors relative flex flex-col justify-between"
                    >
                      <div>
                        {/* Thumbnail Preview */}
                        <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-black border border-zinc-800">
                          <img
                            src={item.previewUrl}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                          {!isUploading && (
                            <button
                              onClick={() => removeQueueItem('image', item.id)}
                              className="absolute top-1 right-1 h-6 w-6 rounded-md bg-black/80 text-zinc-400 hover:text-red-400 flex items-center justify-center text-xs"
                              title="Hapus"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <p className="text-[11px] font-mono font-bold text-white truncate mt-1.5" title={item.name}>
                          #{idx + 1} {item.name}
                        </p>
                        <span className="text-[10px] font-mono text-zinc-500">{item.size}</span>
                      </div>

                      {/* Status / Result */}
                      <div className="pt-1.5 border-t border-zinc-800 text-xs font-mono">
                        {item.status === 'pending' && (
                          <span className="text-zinc-500 text-[10px]">Siap</span>
                        )}
                        {item.status === 'uploading' && (
                          <span className="text-purple-400 text-[10px] flex items-center gap-1">
                            <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Uploading...
                          </span>
                        )}
                        {item.status === 'success' && (
                          <div className="space-y-1">
                            <span className="text-emerald-400 text-[10px] font-bold block truncate">
                              ID: {item.assetId}
                            </span>
                            <button
                              onClick={() => handleCopyAssetId(item.assetId!)}
                              className="w-full text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-0.5 rounded flex items-center justify-center gap-1"
                            >
                              {copiedId === item.assetId ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
                              <span>{copiedId === item.assetId ? 'Copied' : 'Copy ID'}</span>
                            </button>
                          </div>
                        )}
                        {item.status === 'error' && (
                          <span className="text-red-400 text-[9px] block truncate" title={item.errorMessage}>
                            Error
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
};
