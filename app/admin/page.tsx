'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Lock, 
  PlusCircle, 
  Trash2, 
  Edit3, 
  Download, 
  Upload, 
  ExternalLink, 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Image as ImageIcon,
  FileCode,
  Tag,
  LogOut,
  FolderDown,
  CloudCheck
} from 'lucide-react';
import { Asset, AssetCategory } from '@/types';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [products, setProducts] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<AssetCategory>('models');
  const [subcategory, setSubcategory] = useState('Props & City');
  const [format, setFormat] = useState<'RBXM' | 'OBJ' | 'PNG / PBR' | 'LUAU' | 'AUDIO' | 'PRESET'>('RBXM');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [robloxAssetId, setRobloxAssetId] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [luauCode, setLuauCode] = useState('');
  const [fileSize, setFileSize] = useState('1.5 MB');
  const [creatorName, setCreatorName] = useState('Admin Riki');
  const [tagsInput, setTagsInput] = useState('free, roblox, dev');

  // Check existing login session
  useEffect(() => {
    const savedAuth = sessionStorage.getItem('admin_session');
    if (savedAuth === 'authenticated') {
      setIsAuthenticated(true);
      fetchProducts();
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem('admin_session', 'authenticated');
        fetchProducts();
      } else {
        setLoginError(data.error || 'Password salah!');
      }
    } catch (err) {
      setLoginError('Koneksi gagal ke server');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_session');
    setIsAuthenticated(false);
    setPasswordInput('');
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/products');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setProducts(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Convert uploaded image file to Data URL
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Ukuran gambar maksimal 2MB untuk upload langsung.');
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
      subcategory,
      format,
      thumbnail: thumbnailUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
      robloxAssetId: robloxAssetId.trim() || undefined,
      downloadUrl: downloadUrl.trim() || undefined,
      luauCode: luauCode.trim() || undefined,
      fileSize: fileSize.trim() || '1.0 MB',
      creatorName: creatorName.trim() || 'Admin Riki',
      tags: tagsArray.length > 0 ? tagsArray : ['free', 'dev'],
      license: 'Free Community Asset',
    };

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: productPayload }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: data.message || 'Produk berhasil disimpan ke GitHub & Local!',
        });
        setProducts(data.data);
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
        text: err.message || 'Gagal mengirim request',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Yakin ingin menghapus produk ini? Perubahan akan disimpan ke GitHub.')) return;

    setSyncing(true);
    try {
      const res = await fetch(`/api/admin/products?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProducts(data.data);
        setStatusMessage({
          type: 'success',
          text: 'Produk berhasil dihapus dan disinkronkan ke GitHub!',
        });
      }
    } catch (err) {
      alert('Gagal menghapus produk');
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
    setRobloxAssetId(item.robloxAssetId || '');
    setDownloadUrl(item.downloadUrl || '');
    setLuauCode(item.luauCode || '');
    setFileSize(item.fileSize || '1.0 MB');
    setCreatorName(item.creator.name);
    setTagsInput(item.tags ? item.tags.join(', ') : '');
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setCategory('models');
    setSubcategory('Props & City');
    setFormat('RBXM');
    setThumbnailUrl('');
    setImagePreview('');
    setRobloxAssetId('');
    setDownloadUrl('');
    setLuauCode('');
    setFileSize('1.5 MB');
    setCreatorName('Admin Riki');
    setTagsInput('free, roblox, dev');
  };

  // Download full JSON backup to user's PC
  const downloadBackupJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(products, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `products-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Restore from JSON file
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
              await fetch('/api/admin/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product: item }),
              });
            }
            await fetchProducts();
            setStatusMessage({
              type: 'success',
              text: `Berhasil merestore ${parsed.length} produk dari file JSON!`,
            });
          }
        } catch (err) {
          alert('Format file JSON tidak valid!');
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
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#101014] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-white via-zinc-400 to-zinc-700" />
          
          <div className="text-center mb-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-700 bg-black/60 mb-3 text-white">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white uppercase font-mono">
              MAPDEV // ADMIN PORTAL
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Masukkan password admin untuk mengelola katalog produk.
            </p>
          </div>

          {loginError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-zinc-300 mb-1.5">Password Admin:</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Masukkan password admin..."
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-white py-3 text-xs font-bold font-mono tracking-wider text-black hover:bg-zinc-200 transition-colors uppercase disabled:opacity-50"
            >
              {loading ? 'Memverifikasi...' : 'Unlock Admin Panel'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-zinc-800 text-center">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Kembali ke Beranda Web</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. DASHBOARD SCREEN
  return (
    <div className="min-h-screen bg-[#08080a] text-zinc-200">
      
      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-[#0d0d10]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-black/60 px-2.5 py-1 text-xs text-zinc-300 hover:text-white">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lihat Web</span>
            </Link>
            <div className="h-4 w-px bg-zinc-800" />
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-white tracking-wider">ADMIN CONTROL CENTER</span>
              <span className="rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono uppercase">
                GitHub Live Sync
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchProducts}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-surface px-3 py-1.5 text-xs font-mono text-zinc-300 hover:text-white"
              title="Refresh Data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={downloadBackupJson}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-surface px-3 py-1.5 text-xs font-mono text-zinc-300 hover:text-white"
              title="Download JSON Backup ke Komputer"
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

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Status Toast / Banner */}
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

        {/* Info Box: Garansi Produk Tidak Hilang */}
        <div className="rounded-2xl border border-zinc-800 bg-[#121217] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Garansi Data Permanen (Aman dari Redeploy Vercel)
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                Setiap kali kamu menambah atau menghapus produk di sini, data langsung di-commit ke file 
                <code className="text-white bg-zinc-900 px-1.5 py-0.5 rounded font-mono ml-1 mr-1">data/products.json</code> 
                di repository GitHub kamu. Jadi walaupun Vercel dideploy ulang 1000 kali, produk <strong className="text-white">TIDAK AKAN HILANG</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label className="cursor-pointer flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-black/60 px-3 py-2 text-xs font-mono text-zinc-300 hover:text-white">
              <Upload className="h-3.5 w-3.5" />
              <span>Import JSON</span>
              <input type="file" accept=".json" onChange={handleRestoreBackupJson} className="hidden" />
            </label>
          </div>
        </div>

        {/* 2-Column Layout: Form & Product List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Form Tambah / Edit Produk (5 cols) */}
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
              
              {/* Judul Produk */}
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">
                  1. Judul Produk *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Cyberpunk Hover Car Pack"
                  className="w-full rounded-xl border border-zinc-700 bg-black px-3.5 py-2 text-xs text-white focus:border-white focus:outline-none"
                />
              </div>

              {/* Deskripsi Produk */}
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">
                  2. Deskripsi Produk *
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Jelaskan detail produk, polycount, fitur, dll..."
                  className="w-full rounded-xl border border-zinc-700 bg-black px-3.5 py-2 text-xs text-white focus:border-white focus:outline-none resize-none"
                />
              </div>

              {/* Gambar / Image (URL atau Upload) */}
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
                    placeholder="https://images.unsplash.com/... atau link imgur"
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

              {/* File Produk (Roblox Asset ID, Link Download, atau Luau Script) */}
              <div className="rounded-xl border border-zinc-800 bg-black/40 p-3 space-y-3">
                <label className="block text-xs font-mono font-bold text-white">
                  4. File / Resource Produk (Pilih salah satu / kombinasi):
                </label>

                <div>
                  <span className="block text-[11px] font-mono text-zinc-400 mb-1">A. Roblox Asset ID (Jika ada):</span>
                  <input
                    type="text"
                    value={robloxAssetId}
                    onChange={(e) => setRobloxAssetId(e.target.value)}
                    placeholder="e.g. 13894729104"
                    className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-1.5 text-xs text-white focus:border-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <span className="block text-[11px] font-mono text-zinc-400 mb-1">B. URL Download File (Google Drive / GitHub / Mediafire):</span>
                  <input
                    type="text"
                    value={downloadUrl}
                    onChange={(e) => setDownloadUrl(e.target.value)}
                    placeholder="https://github.com/.../file.rbxm atau drive.google.com"
                    className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-1.5 text-xs text-white focus:border-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <span className="block text-[11px] font-mono text-zinc-400 mb-1">C. Script Luau (Jika produk berbentuk Script):</span>
                  <textarea
                    rows={2}
                    value={luauCode}
                    onChange={(e) => setLuauCode(e.target.value)}
                    placeholder="-- Paste kode Luau di sini jika produk berupa script..."
                    className="w-full rounded-lg border border-zinc-700 bg-black p-2 text-[11px] font-mono text-zinc-300 focus:border-white focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Kategori, Format & File Size */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1">Kategori:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                  >
                    <option value="models">3D Models & Props</option>
                    <option value="pbr">PBR Textures</option>
                    <option value="scripts">Luau Scripts</option>
                    <option value="lighting">Lighting Presets</option>
                    <option value="skyboxes">Skyboxes</option>
                    <option value="sfx">Audio & SFX</option>
                    <option value="ui">Developer UI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1">Format Badge:</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                  >
                    <option value="RBXM">RBXM</option>
                    <option value="OBJ">OBJ</option>
                    <option value="PNG / PBR">PNG / PBR</option>
                    <option value="LUAU">LUAU</option>
                    <option value="AUDIO">AUDIO</option>
                    <option value="PRESET">PRESET</option>
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

              {/* Creator & Tags */}
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
                  <label className="block text-xs font-mono text-zinc-300 mb-1">Tags (pisahkan koma):</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="car, cyber, model"
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
                      <span>Sinkronisasi ke GitHub...</span>
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

          {/* Right Column: Daftar Produk Saat Ini (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div>
                <h2 className="text-base font-bold text-white uppercase font-mono">
                  Daftar Produk Aktif ({products.length})
                </h2>
                <p className="text-xs text-zinc-400">
                  Semua item di bawah otomatis tampil di card web utama.
                </p>
              </div>
            </div>

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

          </div>

        </div>

      </main>

    </div>
  );
}
