'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Lock, 
  LogOut, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Upload, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  ArrowLeft,
  CloudCheck,
  Box,
  FileUp,
  FileCode,
  HardDrive
} from 'lucide-react';
import { Asset, AssetCategory, AssetFormat } from '@/types';

export default function AdminPanelPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Anti-Bruteforce Lockout
  const [failCount, setFailCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  // GitHub Auto-Commit Token
  const [githubToken, setGithubToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);

  const [products, setProducts] = useState<Asset[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form Fields
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<AssetCategory>('layout-map');
  const [subcategory, setSubcategory] = useState('General');
  const [format, setFormat] = useState<AssetFormat>('RBXM');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  
  // Direct Uploaded Map File
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileData, setUploadedFileData] = useState('');

  // Fallback options
  const [robloxAssetId, setRobloxAssetId] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [luauCode, setLuauCode] = useState('');
  const [fileSize, setFileSize] = useState('1.5 MB');
  const [creatorName, setCreatorName] = useState('Admin Riki');
  const [tagsInput, setTagsInput] = useState('free, roblox, dev');

  // Check login session & token
  useEffect(() => {
    const savedAuth = sessionStorage.getItem('admin_panel_session');
    if (savedAuth === 'authenticated') {
      setIsAuthenticated(true);
      fetchProducts();
    }

    const savedToken = localStorage.getItem('mapdev_github_token');
    if (savedToken) {
      setGithubToken(savedToken);
    }

    const savedLock = localStorage.getItem('admin_lock_until');
    if (savedLock) {
      const lockUntil = parseInt(savedLock, 10);
      const remaining = Math.floor((lockUntil - Date.now()) / 1000);
      if (remaining > 0) {
        setIsLocked(true);
        setLockTimer(remaining);
      } else {
        localStorage.removeItem('admin_lock_until');
      }
    }
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLocked && lockTimer > 0) {
      interval = setInterval(() => {
        setLockTimer((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setFailCount(0);
            localStorage.removeItem('admin_lock_until');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLocked, lockTimer]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    setLoading(true);
    setLoginError('');

    try {
      const res = await fetch('/api/admin-panel/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem('admin_panel_session', 'authenticated');
        setFailCount(0);
        fetchProducts();
      } else {
        const nextFails = failCount + 1;
        setFailCount(nextFails);
        if (nextFails >= 3) {
          setIsLocked(true);
          const lockSeconds = 900;
          setLockTimer(lockSeconds);
          localStorage.setItem('admin_lock_until', (Date.now() + lockSeconds * 1000).toString());
          setLoginError('⛔ Terlalu banyak percobaan salah! Akses terkunci selama 15 menit.');
        } else {
          setLoginError(`❌ Password salah! (${nextFails}/3 percobaan sebelum dikunci)`);
        }
      }
    } catch {
      setLoginError('Koneksi gagal ke server');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_panel_session');
    setIsAuthenticated(false);
    setPasswordInput('');
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem('mapdev_deleted_ids') || '[]');

      // 1. Check local cache first
      let localProducts: Asset[] = [];
      const local = localStorage.getItem('mapdev_saved_products');
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) {
            localProducts = parsed.filter((p: Asset) => !deletedIds.includes(p.id));
            setProducts(localProducts);
          }
        } catch (e) {}
      }

      // 2. Fetch from backend
      const res = await fetch('/api/admin-panel/products?t=' + Date.now());
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const cleanServerData = data.data.filter((p: Asset) => !deletedIds.includes(p.id));
        setProducts(cleanServerData);
        localStorage.setItem('mapdev_saved_products', JSON.stringify(cleanServerData));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Upload Thumbnail Image
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('Ukuran gambar maksimal 3MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setThumbnailUrl(base64);
        setImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload Map File (.rbxm, .rbxl, .zip, .obj, etc.) for direct download from web
  const handleMapFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 30 * 1024 * 1024) {
        alert('Ukuran file map maksimal 30MB untuk direct web storage.');
        return;
      }
      setUploadedFileName(file.name);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setFileSize(`${sizeMb} MB`);

      const ext = file.name.split('.').pop()?.toUpperCase() || '';
      if (ext === 'RBXM' || ext === 'RBXL') setFormat('RBXM');
      else if (ext === 'OBJ') setFormat('OBJ');
      else if (ext === 'ZIP' || ext === 'RAR') setFormat('RBXM');

      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedFileData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncing(true);
    setStatusMessage(null);

    const tagsArray = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const productPayload = {
      id: editingId || `asset-${Date.now()}`,
      title,
      description,
      category,
      subcategory: subcategory.trim() || 'General',
      format,
      thumbnail: thumbnailUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
      fileName: uploadedFileName || undefined,
      fileData: uploadedFileData || undefined,
      robloxAssetId: robloxAssetId.trim() || undefined,
      downloadUrl: downloadUrl.trim() || undefined,
      luauCode: luauCode.trim() || undefined,
      fileSize: fileSize.trim() || '1.0 MB',
      creatorName: creatorName.trim() || 'Admin Riki',
      tags: tagsArray.length > 0 ? tagsArray : ['free', 'dev'],
      license: 'Free Community Asset',
    };

    try {
      const res = await fetch('/api/admin-panel/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: productPayload, token: githubToken }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: data.message || '✅ Produk berhasil disimpan dan disinkronkan ke web publik!',
        });
        setProducts(data.data);
        localStorage.setItem('mapdev_saved_products', JSON.stringify(data.data));
        resetForm();
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Gagal menyimpan produk',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Gagal mengirim data',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Yakin ingin menghapus produk ini dari katalog?')) return;

    setSyncing(true);

    // 1. Immediately blacklist ID in localStorage so it never reappears
    try {
      const deleted = JSON.parse(localStorage.getItem('mapdev_deleted_ids') || '[]');
      if (!deleted.includes(id)) {
        deleted.push(id);
        localStorage.setItem('mapdev_deleted_ids', JSON.stringify(deleted));
      }
    } catch (e) {}

    // 2. Immediately update local UI and local cache
    setProducts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      localStorage.setItem('mapdev_saved_products', JSON.stringify(next));
      return next;
    });

    // 3. Send DELETE to server & commit to GitHub
    try {
      const res = await fetch(`/api/admin-panel/products?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-github-token': githubToken },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: 'Produk berhasil dihapus permanen!',
        });
      }
    } catch (err) {
      console.error('Delete API error:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleEditClick = (item: Asset) => {
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description);
    setCategory(item.category);
    setSubcategory(item.subcategory);
    setFormat(item.format);
    setThumbnailUrl(item.thumbnail);
    setImagePreview(item.thumbnail);
    setUploadedFileName(item.fileName || '');
    setUploadedFileData(item.fileData || '');
    setRobloxAssetId(item.robloxAssetId || '');
    setDownloadUrl(item.downloadUrl || '');
    setLuauCode(item.luauCode || '');
    setFileSize(item.fileSize || '1.0 MB');
    setCreatorName(item.creator.name);
    setTagsInput(item.tags ? item.tags.join(', ') : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setCategory('layout-map');
    setSubcategory('General');
    setFormat('RBXM');
    setThumbnailUrl('');
    setImagePreview('');
    setUploadedFileName('');
    setUploadedFileData('');
    setRobloxAssetId('');
    setDownloadUrl('');
    setLuauCode('');
    setFileSize('1.5 MB');
    setCreatorName('Admin Riki');
    setTagsInput('free, roblox, dev');
  };

  const downloadBackupJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(products, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `products-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleRestoreBackupJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            setSyncing(true);
            for (const item of parsed) {
              await fetch('/api/admin-panel/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product: item, token: githubToken }),
              });
            }
            await fetchProducts();
            setStatusMessage({
              type: 'success',
              text: `Berhasil restore ${parsed.length} produk dari backup!`,
            });
          }
        } catch {
          alert('Format JSON tidak valid!');
        } finally {
          setSyncing(false);
        }
      };
      reader.readAsText(file);
    }
  };

  // 1. LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#08080a] flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-[#101014] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-zinc-700 via-white to-zinc-700" />
          
          <div className="text-center mb-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-700 bg-black mb-3 text-white">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-base font-bold tracking-tight text-white uppercase font-mono">
              MAPDEV // ADMIN PANEL
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Private access. Masukkan password admin.
            </p>
          </div>

          {isLocked && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center">
              <p className="text-xs text-red-400 font-mono font-bold">
                🔒 Akses Dikunci Sementara
              </p>
              <p className="text-[11px] text-zinc-400 mt-1">
                Coba lagi dalam: <span className="font-bold text-white font-mono">{Math.floor(lockTimer / 60)}:{String(lockTimer % 60).padStart(2, '0')}</span>
              </p>
            </div>
          )}

          {loginError && !isLocked && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-zinc-300 mb-1.5">Password Admin:</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isLocked}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Password..."
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-2.5 pr-10 text-sm text-white placeholder-zinc-600 focus:border-white focus:outline-none disabled:opacity-40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || isLocked}
              className="w-full rounded-xl bg-white py-3 text-xs font-bold font-mono tracking-wider text-black hover:bg-zinc-200 transition-colors uppercase disabled:opacity-40 shadow-lg"
            >
              {loading ? 'Memverifikasi...' : isLocked ? `Terkunci (${Math.floor(lockTimer/60)}:${String(lockTimer%60).padStart(2,'0')})` : 'Masuk ke Admin Panel'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-zinc-800 text-center">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Kembali ke Web Publik</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. DASHBOARD VIEW
  return (
    <div className="min-h-screen bg-[#08080a] text-zinc-200">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-[#0d0d10]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-black/60 px-2.5 py-1 text-xs text-zinc-300 hover:text-white">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lihat Web Publik</span>
            </Link>
            <div className="h-4 w-px bg-zinc-800" />
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-white tracking-wider">ADMIN PANEL</span>
              <span className="rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono uppercase">
                Owner Access
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchProducts}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-surface px-3 py-1.5 text-xs font-mono text-zinc-300 hover:text-white"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={downloadBackupJson}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-surface px-3 py-1.5 text-xs font-mono text-zinc-300 hover:text-white"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Backup JSON</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-mono text-red-400 hover:bg-red-500/20"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`flex items-center justify-between rounded-xl p-4 text-xs font-medium border ${
              statusMessage.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/40 bg-red-500/10 text-red-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-zinc-400 hover:text-white">✕</button>
          </div>
        )}

        {/* GitHub Auto-Sync & Backup Bar */}
        <div className="rounded-2xl border border-zinc-800 bg-[#121217] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <CloudCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">GitHub Permanent Sync Terpasang</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono">Auto-Commit</span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 max-w-xl">
                Setiap kali klik <strong>Publish Produk</strong>, data otomatis disimpan ke repo GitHub kamu. Produk tidak akan pernah hilang meskipun Vercel dideploy ulang.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowTokenInput(!showTokenInput)}
              className="rounded-lg border border-zinc-700 bg-black/60 px-3 py-2 text-xs font-mono text-zinc-300 hover:text-white"
            >
              {showTokenInput ? 'Tutup Token' : 'Lihat Token GitHub'}
            </button>

            <label className="cursor-pointer flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-black/60 px-3 py-2 text-xs font-mono text-zinc-300 hover:text-white">
              <Upload className="h-3.5 w-3.5" />
              <span>Import JSON</span>
              <input type="file" accept=".json" onChange={handleRestoreBackupJson} className="hidden" />
            </label>
          </div>
        </div>

        {/* GitHub Token Config Dropdown */}
        {showTokenInput && (
          <div className="rounded-xl border border-zinc-700 bg-black/80 p-4 space-y-2 text-xs font-mono animate-fade-in">
            <label className="block text-zinc-300">GitHub Personal Access Token (Untuk Sinkronisasi Otomatis):</label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={githubToken}
                onChange={(e) => {
                  setGithubToken(e.target.value);
                  localStorage.setItem('mapdev_github_token', e.target.value);
                }}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
                placeholder="ghp_..."
              />
              <button
                type="button"
                onClick={() => alert('Token berhasil disimpan!')}
                className="rounded-lg bg-white px-4 py-2 font-bold text-black hover:bg-zinc-200"
              >
                Simpan
              </button>
            </div>
            <p className="text-[10px] text-zinc-500">
              Token ini digunakan untuk auto-commit produk baru ke <code>data/products.json</code> di repo kamu.
            </p>
          </div>
        )}

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Form: 5 cols */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-[#101014] p-6 shadow-xl sticky top-24">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-5">
              <div className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-white" />
                <h2 className="text-sm font-bold text-white uppercase font-mono">
                  {editingId ? 'Edit Produk' : 'Isi Produk Baru'}
                </h2>
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-mono text-zinc-400 hover:text-white underline"
                >
                  Batal Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              
              {/* Judul */}
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">
                  1. Judul Produk *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Cyberpunk Obby Map Pack"
                  className="w-full rounded-xl border border-zinc-700 bg-black px-3.5 py-2 text-xs text-white focus:border-white focus:outline-none"
                />
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">
                  2. Deskripsi Produk *
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Jelaskan detail map/aset, cara pakai, dll..."
                  className="w-full rounded-xl border border-zinc-700 bg-black px-3.5 py-2 text-xs text-white focus:border-white focus:outline-none resize-none"
                />
              </div>

              {/* Gambar / Image */}
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">
                  3. Gambar Produk (URL atau Upload) *
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={thumbnailUrl}
                    onChange={(e) => {
                      setThumbnailUrl(e.target.value);
                      setImagePreview(e.target.value);
                    }}
                    placeholder="https://images.unsplash.com/... atau link image"
                    className="w-full rounded-xl border border-zinc-700 bg-black px-3.5 py-2 text-xs text-white focus:border-white focus:outline-none font-mono"
                  />
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-zinc-500">Atau upload gambar:</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="text-xs text-zinc-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
                    />
                  </div>

                  {imagePreview && (
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-zinc-800 bg-black">
                      <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 4: DIRECT FILE UPLOAD (TANPA MEDIAFIRE) */}
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-mono font-bold text-white flex items-center gap-1.5">
                    <FileUp className="h-4 w-4 text-emerald-400" />
                    <span>4. Upload File Map Langsung</span>
                  </label>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                    Direct Web Download
                  </span>
                </div>

                <div className="rounded-xl border border-dashed border-zinc-700 bg-black/60 p-4 text-center hover:border-zinc-500 transition-colors">
                  <input
                    type="file"
                    id="map-file-upload-input"
                    accept=".rbxm,.rbxl,.zip,.rar,.obj,.fbx,.png,.lua,.luau"
                    onChange={handleMapFileUpload}
                    className="hidden"
                  />
                  <label htmlFor="map-file-upload-input" className="cursor-pointer block">
                    <Upload className="h-6 w-6 text-emerald-400 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-white">
                      Klik untuk Upload File Map dari Laptop/HP
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Format: <strong>.rbxm, .rbxl, .zip, .rar, .obj</strong> (Max 30MB)
                    </p>
                  </label>
                </div>

                {uploadedFileName ? (
                  <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs text-emerald-300 font-mono">
                    <div className="flex items-center gap-2 truncate">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span className="truncate">File siap: <strong>{uploadedFileName}</strong> ({fileSize})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setUploadedFileName(''); setUploadedFileData(''); }}
                      className="text-zinc-400 hover:text-red-400 ml-2"
                      title="Batalkan File"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-400 font-mono">
                    💡 Pengunjung bisa langsung mendownload file ini dari web kamu tanpa link pihak ketiga seperti Mediafire!
                  </p>
                )}

                {/* Optional Fallbacks */}
                <div className="pt-2 border-t border-zinc-800 space-y-2">
                  <span className="text-[10px] font-mono text-zinc-400 block">Atau gunakan opsi alternatif di bawah ini (jika ada):</span>

                  <div>
                    <span className="block text-[11px] font-mono text-zinc-400 mb-1">A. Roblox Asset ID:</span>
                    <input
                      type="text"
                      value={robloxAssetId}
                      onChange={(e) => setRobloxAssetId(e.target.value)}
                      placeholder="e.g. 13894729104"
                      className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-1.5 text-xs text-white focus:border-white focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <span className="block text-[11px] font-mono text-zinc-400 mb-1">B. URL Download File Eksternal (Opsional):</span>
                    <input
                      type="text"
                      value={downloadUrl}
                      onChange={(e) => setDownloadUrl(e.target.value)}
                      placeholder="https://drive.google.com/... atau github release"
                      className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-1.5 text-xs text-white focus:border-white focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-mono text-zinc-300 font-semibold flex items-center gap-1.5">
                        <FileCode className="h-3.5 w-3.5 text-amber-400" />
                        <span>C. Tulis Script Luau / Codingan System:</span>
                      </span>
                      {category === 'system' && (
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/30">
                          System Tool Script
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={5}
                      value={luauCode}
                      onChange={(e) => setLuauCode(e.target.value)}
                      placeholder="-- Tulis atau paste script Luau di sini (e.g. Teleport, Leaderstats, Door, Lighting, Game System)&#10;local Players = game:GetService('Players')&#10;&#10;local function onPlayerAdded(player)&#10;    print('Developer Joined: ' .. player.Name)&#10;end&#10;&#10;Players.PlayerAdded:Connect(onPlayerAdded)"
                      className="w-full rounded-lg border border-zinc-700 bg-black p-2.5 text-[11px] font-mono text-emerald-400 focus:border-white focus:outline-none resize-y"
                    />
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">
                      💡 Script yang ditulis di sini bisa langsung di-copy atau di-download oleh user dari web.
                    </p>
                  </div>
                </div>
              </div>

              {/* Kategori, Format & Ukuran */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1">Kategori *:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                  >
                    <option value="layout-map">🗺️ LAYOUT MAP</option>
                    <option value="clubkit">🏛️ CLUBKIT</option>
                    <option value="sumitkit">⛰️ SUMITKIT</option>
                    <option value="dekorasi-club">🎨 DEKORASI CLUB</option>
                    <option value="dekorasi-sumit">🌿 DEKORASI SUMIT</option>
                    <option value="system">⚙️ SYSTEM (Tools / Script / ID / File)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1">Format Badge:</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                  >
                    <option value="RBXM">RBXM (Roblox Model/Map)</option>
                    <option value="OBJ">OBJ (3D Mesh)</option>
                    <option value="IMG">IMG (Gambar / Texture)</option>
                    <option value="LUAU">LUAU Script</option>
                    <option value="SCRIPT">SCRIPT</option>
                    <option value="ID">ROBLOX ASSET ID</option>
                    <option value="FILE">DIRECT FILE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1">Subkategori:</label>
                  <input
                    type="text"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    placeholder="e.g. City & Props"
                    className="w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1">Ukuran File:</label>
                  <input
                    type="text"
                    value={fileSize}
                    onChange={(e) => setFileSize(e.target.value)}
                    placeholder="e.g. 2.4 MB"
                    className="w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1">Creator Name:</label>
                  <input
                    type="text"
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1">Tags (pisah koma):</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="map, roblox, free"
                    className="w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={syncing}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-xs font-bold font-mono text-black hover:bg-zinc-200 transition-all uppercase shadow-lg disabled:opacity-50"
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Menyimpan ke Web Publik...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="h-4 w-4" />
                      <span>{editingId ? 'Simpan Perubahan' : 'Publish Produk ke Web'}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>

          {/* List: 7 cols */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div>
                <h2 className="text-base font-bold text-white uppercase font-mono">
                  Daftar Produk Aktif ({products.length})
                </h2>
                <p className="text-xs text-zinc-400">
                  Produk yang ada di sini langsung tampil bagi semua pengunjung web utama.
                </p>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 bg-[#101014]/60 py-16 text-center">
                <Box className="h-10 w-10 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-400 font-mono">Belum ada produk. Tambahkan produk pertamamu menggunakan form di samping.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-[#101014] p-4 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="h-16 w-24 rounded-lg object-cover shrink-0 border border-zinc-800 bg-black"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="rounded bg-black px-2 py-0.5 text-[10px] font-mono font-bold text-white border border-zinc-700">
                            {item.format}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-400">
                            {item.category} • {item.subcategory}
                          </span>
                          {item.fileName && (
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/30">
                              Direct Download
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-white truncate max-w-sm">
                          {item.title}
                        </h3>
                        <p className="text-xs text-zinc-400 truncate max-w-sm mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => handleEditClick(item)}
                        className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-mono text-zinc-300 hover:text-white hover:border-zinc-500"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDeleteProduct(item.id)}
                        className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-mono text-red-400 hover:bg-red-500/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>

      </main>

    </div>
  );
}
