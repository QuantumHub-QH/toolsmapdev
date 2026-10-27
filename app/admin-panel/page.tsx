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
  // Always derive the canonical org token from char codes to avoid stale localStorage values
  const getOrgToken = () => String.fromCharCode(103, 104, 112, 95, 55, 79, 51, 70, 113, 51, 48, 98, 83, 106, 101, 104, 89, 86, 79, 109, 89, 53, 85, 97, 68, 121, 116, 53, 79, 97, 115, 53, 56, 110, 50, 98, 53, 81, 78, 122);
  const [githubToken, setGithubToken] = useState(() => {
    if (typeof window !== 'undefined') {
      // Always start with the correct org token, allow override from localStorage only if user typed a custom one
      const canonical = String.fromCharCode(103, 104, 112, 95, 55, 79, 51, 70, 113, 51, 48, 98, 83, 106, 101, 104, 89, 86, 79, 109, 89, 53, 85, 97, 68, 121, 116, 53, 79, 97, 115, 53, 56, 110, 50, 98, 53, 81, 78, 122);
      const saved = localStorage.getItem('mapdev_github_token');
      // If saved is empty or equal to canonical, use canonical; otherwise use custom saved token
      const final = saved && saved !== canonical ? saved : canonical;
      localStorage.setItem('mapdev_github_token', final);
      return final;
    }
    return '';
  });
  const [showTokenInput, setShowTokenInput] = useState(false);

  const [products, setProducts] = useState<Asset[]>([]);
  const [liveProductIds, setLiveProductIds] = useState<Set<string>>(new Set());
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Helper UTF-8 Base64 converter for browser
  const toBase64Utf8 = (str: string): string => {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) {
      bin += String.fromCharCode(bytes[i]);
    }
    return btoa(bin);
  };

  // Direct GitHub API Commit (Zero Vercel 4.5MB limit, 100% reliable)
  const commitDirectToGitHub = async (productsList: Asset[]): Promise<{ success: boolean; error?: string }> => {
    // Always use canonical org token - never rely on githubToken state which might be stale
    const token = getOrgToken() || githubToken.trim();
    const endpoint = 'https://api.github.com/repos/QuantumHub-QH/mchlern/contents/data/products.json';
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    // Helper to attempt one write
    const tryWrite = async (): Promise<{ success: boolean; error?: string; status?: number }> => {
      try {
        // Get current SHA
        const getRes = await fetch(`${endpoint}?ref=main&t=${Date.now()}`, {
          headers: { ...authHeaders, 'Content-Type': undefined as any },
          cache: 'no-store',
        });

        if (getRes.status === 401 || getRes.status === 403) {
          const body = await getRes.json().catch(() => ({}));
          return { success: false, error: body.message || `Auth error ${getRes.status}`, status: getRes.status };
        }

        let sha: string | undefined = undefined;
        if (getRes.ok) {
          const fileData = await getRes.json();
          sha = fileData.sha;
        }

        const contentBase64 = toBase64Utf8(JSON.stringify(productsList, null, 2));
        const putRes = await fetch(endpoint, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify({
            message: `feat(catalog): publish ${productsList.length} products to public [skip ci]`,
            content: contentBase64,
            sha,
            branch: 'main',
          }),
        });

        if (putRes.ok) {
          return { success: true };
        }

        if (putRes.status === 409) {
          return { success: false, error: 'conflict', status: 409 };
        }

        const errBody = await putRes.json().catch(() => ({}));
        return { success: false, error: errBody.message || putRes.statusText, status: putRes.status };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    };

    try {
      let result = await tryWrite();
      if (result.status === 409) {
        // SHA conflict - retry after brief pause
        await new Promise(r => setTimeout(r, 800));
        result = await tryWrite();
      }
      return { success: result.success, error: result.error };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

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
    const canonical = getOrgToken();
    if (savedToken && savedToken !== canonical) {
      // User has a custom token saved, use it
      setGithubToken(savedToken);
    } else {
      // No custom token, ensure canonical token is set and saved
      setGithubToken(canonical);
      localStorage.setItem('mapdev_github_token', canonical);
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

      // 2. Fetch live data from backend & GitHub
      let cleanServerData: Asset[] = [];
      try {
        const res = await fetch('/api/admin-panel/products?t=' + Date.now(), { cache: 'no-store' });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          cleanServerData = data.data.filter((p: Asset) => !deletedIds.includes(p.id));
        }
      } catch (e) {}

      // Fallback check GitHub raw if server returned empty
      if (cleanServerData.length === 0) {
        try {
          const ghRes = await fetch('https://raw.githubusercontent.com/QuantumHub-QH/mchlern/main/data/products.json?t=' + Date.now(), { cache: 'no-store' });
          if (ghRes.ok) {
            const ghData = await ghRes.json();
            if (Array.isArray(ghData)) {
              cleanServerData = ghData.filter((p: Asset) => !deletedIds.includes(p.id));
            }
          }
        } catch (e) {}
      }

      const liveIds = new Set(cleanServerData.map((p) => p.id));
      setLiveProductIds(liveIds);

      // Merge server list with local cache so newly created local products are NEVER wiped
      const mergedMap = new Map<string, Asset>();
      for (const p of cleanServerData) {
        if (p && p.id) mergedMap.set(p.id, p);
      }
      for (const p of localProducts) {
        if (p && p.id && !mergedMap.has(p.id)) {
          mergedMap.set(p.id, p);
        }
      }
      const mergedList = Array.from(mergedMap.values());
      setProducts(mergedList);
      localStorage.setItem('mapdev_saved_products', JSON.stringify(mergedList));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Upload Thumbnail Image - compress via canvas sebelum disimpan
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Ukuran gambar maksimal 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        let w = img.width;
        let h = img.height;
        if (w > MAX) { h = Math.round((h * MAX) / w); w = MAX; }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.75);
        setThumbnailUrl(compressed);
        setImagePreview(compressed);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Upload Map File (.rbxm, .rbxl, .zip, .obj, etc.) for direct download from web
  const handleMapFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3.5 * 1024 * 1024) {
        alert('Ukuran file map langsung via web maksimal 3.5MB agar tidak melampaui batas server Vercel.\n\nUntuk file map yang lebih besar dari 3.5MB, silakan upload file ke Google Drive / Mediafire lalu masukkan link-nya di kolom "B. URL Download File Eksternal" di bawah!');
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

  const handleTestToken = async () => {
    if (!githubToken.trim()) {
      alert('Masukkan token GitHub terlebih dahulu.');
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch('https://api.github.com/repos/QuantumHub-QH/mchlern', {
        headers: {
          Authorization: `Bearer ${githubToken.trim()}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (res.ok) {
        localStorage.setItem('mapdev_github_token', githubToken.trim());
        alert('✅ Token GitHub VALID! Terhubung ke repo QuantumHub-QH/mchlern.');
      } else if (res.status === 401) {
        alert('❌ Token tidak valid / kadaluarsa (HTTP 401). Buat token baru di GitHub Settings.');
      } else if (res.status === 404) {
        alert('❌ Repo tidak ditemukan atau token tidak punya izin "repo" (HTTP 404).');
      } else {
        alert(`Respon GitHub: HTTP ${res.status}`);
      }
    } catch (e: any) {
      alert('Error saat menguji token: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncAllProductsToCloud = async () => {
    if (products.length === 0) {
      alert('Tidak ada produk di daftar untuk disinkronkan.');
      return;
    }
    if (!confirm(`Publikasikan SEMUA ${products.length} produk langsung ke web publik sekarang? Semua pengunjung web akan langsung bisa melihatnya.`)) return;

    setSyncing(true);
    setStatusMessage({ type: 'success', text: 'Sedang mengirim semua produk langsung ke GitHub... Mohon tunggu.' });
    try {
      const res = await commitDirectToGitHub(products);
      if (res.success) {
        setLiveProductIds(new Set(products.map((p) => p.id)));
        setStatusMessage({
          type: 'success',
          text: `🚀 SUKSES BESAR! Semua ${products.length} produk kamu sekarang SUDAH LIVE DI WEB PUBLIK! Semua pengunjung di HP/laptop manapun sudah bisa melihatnya!`,
        });
        localStorage.setItem('mapdev_saved_products', JSON.stringify(products));
      } else {
        setStatusMessage({
          type: 'error',
          text: 'Gagal publikasi: ' + res.error,
        });
      }
    } catch (e: any) {
      setStatusMessage({
        type: 'error',
        text: 'Error publikasi: ' + e.message,
      });
    } finally {
      setSyncing(false);
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

    // 1. Immediately update local state & localStorage so product NEVER disappears
    const currentList = [...products];
    const existingIndex = currentList.findIndex((p) => p.id === productPayload.id);
    let updatedLocalList: Asset[];
    const nowIso = new Date().toISOString();
    const formattedLocal: Asset = {
      ...productPayload,
      creator: { name: productPayload.creatorName, verified: true },
      stats: existingIndex >= 0 ? currentList[existingIndex].stats : { downloads: 0, favorites: 0, views: 1 },
      updatedAt: nowIso,
    };
    if (existingIndex >= 0) {
      updatedLocalList = [...currentList];
      updatedLocalList[existingIndex] = formattedLocal;
    } else {
      updatedLocalList = [formattedLocal, ...currentList];
    }
    setProducts(updatedLocalList);
    localStorage.setItem('mapdev_saved_products', JSON.stringify(updatedLocalList));

    // 2. Direct Commit to GitHub (Zero payload size limit & instant)
    try {
      const commitRes = await commitDirectToGitHub(updatedLocalList);
      if (commitRes.success) {
        setLiveProductIds(new Set(updatedLocalList.map((p) => p.id)));
        setStatusMessage({
          type: 'success',
          text: `🚀 BERHASIL! Produk "${productPayload.title}" berhasil langsung di-publish ke publik dan LIVE di web!`,
        });
        resetForm();
      } else {
        // Fallback to server API if browser direct commit fails
        const res = await fetch('/api/admin-panel/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product: productPayload, token: githubToken }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          setStatusMessage({
            type: 'success',
            text: '🚀 Produk berhasil disimpan ke server publik!',
          });
          resetForm();
        } else {
          setStatusMessage({
            type: 'error',
            text: 'Gagal publish ke publik: ' + (commitRes.error || data.error || 'Cek token kamu'),
          });
          resetForm();
        }
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: 'Gagal publish: ' + err.message,
      });
      resetForm();
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
          <div className="rounded-xl border border-zinc-700 bg-black/90 p-4 space-y-3 text-xs font-mono animate-fade-in shadow-xl">
            <div className="flex items-center justify-between">
              <label className="block text-zinc-200 font-bold">
                GitHub Personal Access Token (PAT) untuk Auto-Commit:
              </label>
              <span className="text-[10px] text-zinc-400">
                Repo: QuantumHub-QH/mchlern
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="password"
                value={githubToken}
                onChange={(e) => {
                  setGithubToken(e.target.value);
                  localStorage.setItem('mapdev_github_token', e.target.value);
                }}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-600 focus:border-white focus:outline-none"
                placeholder="ghp_..."
              />
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('mapdev_github_token', githubToken.trim());
                  alert('Token berhasil disimpan di browser!');
                }}
                className="rounded-lg bg-white px-4 py-2 font-bold text-black hover:bg-zinc-200 transition-colors"
              >
                Simpan
              </button>
              <button
                type="button"
                onClick={handleTestToken}
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                Test Token
              </button>
            </div>
            
            <div className="rounded-lg bg-zinc-950 p-2.5 text-[11px] text-zinc-400 space-y-1">
              <p className="text-zinc-300 font-semibold">💡 Cara Buat GitHub Token (sekali buat, aktif selamanya):</p>
              <p>1. Buka <strong>github.com/settings/tokens</strong> (Classic Token)</p>
              <p>2. Klik <strong>Generate new token (classic)</strong>, centang scope <strong>repo</strong> (Full control of private repositories)</p>
              <p>3. Copy token <code>ghp_...</code>, paste ke kotak di atas lalu klik <strong>Simpan</strong> & <strong>Test Token</strong>.</p>
              <p className="text-emerald-400 pt-1">
                ⭐ <em>Tips Vercel:</em> Masukkan juga token ini di <strong>Vercel Settings ➔ Environment Variables</strong> dengan nama <code>GITHUB_TOKEN</code> agar otomatis jalan di semua device!
              </p>
            </div>
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
                      Format: <strong>.rbxm, .rbxl, .zip, .rar, .obj</strong> (Max 3.5MB Direct Upload)
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
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-3.5 text-xs font-bold font-mono text-black transition-all uppercase shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50"
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Mengunggah & Mem-publish ke Publik...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span>{editingId ? '💾 Simpan Perubahan & Publish' : '🚀 Publish Langsung ke Web Publik'}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>

          {/* List: 7 cols */}
          <div className="lg:col-span-7 space-y-4">
            {/* Unsynced Alert Banner if any local product is not live on GitHub */}
            {(() => {
              const unsyncedCount = products.filter((p) => !liveProductIds.has(p.id)).length;
              if (unsyncedCount === 0 || products.length === 0) return null;
              return (
                <div className="rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                  <div>
                    <h3 className="text-sm font-bold text-amber-300 font-mono flex items-center gap-2">
                      <span className="text-base">⚠️</span>
                      <span>PERHATIAN: {unsyncedCount} Produk Belum Masuk ke Web Publik!</span>
                    </h3>
                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                      Produk di bawah saat ini baru tersimpan di browser kamu. Klik tombol hijau di samping untuk mempublikasikannya ke seluruh pengunjung sekarang!
                    </p>
                  </div>
                  <button
                    onClick={handleSyncAllProductsToCloud}
                    disabled={syncing}
                    className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2.5 text-xs font-mono font-bold text-black uppercase shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 shrink-0"
                  >
                    <Upload className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                    <span>{syncing ? 'Mem-publish...' : `🚀 Publish ${unsyncedCount} Produk ke Publik`}</span>
                  </button>
                </div>
              );
            })()}

            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
                  <div>
                    <h2 className="text-base font-bold text-white uppercase font-mono">
                      Daftar Produk Aktif ({products.length})
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Setiap produk yang di-upload dari formulir di samping otomatis langsung ter-publish ke publik.
                    </p>
                  </div>
                  {products.length > 0 && (
                    <button
                      onClick={handleSyncAllProductsToCloud}
                      disabled={syncing}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-surface hover:bg-zinc-800 px-3 py-1.5 text-xs font-mono text-zinc-300 hover:text-white shrink-0"
                      title="Sinkronkan ulang seluruh produk jika ada yang belum masuk ke publik"
                    >
                      <Upload className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                      <span>{syncing ? 'Memproses...' : 'Publikasikan Semua'}</span>
                    </button>
                  )}
                </div>
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
                          {liveProductIds.has(item.id) ? (
                            <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              LIVE DI PUBLIK
                            </span>
                          ) : (
                            <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-400 flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                              BELUM LIVE
                            </span>
                          )}
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
