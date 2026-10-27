import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Asset } from '@/types';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'products.json');
const GITHUB_REPO = 'QuantumHub-QH/mchlern';
const GITHUB_FILE_PATH = 'data/products.json';
const GITHUB_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/${GITHUB_FILE_PATH}`;

// Helper to read products — prefers Firestore, then GitHub raw
async function getProducts(): Promise<Asset[]> {
  // 1. Try Firestore Database (Realtime Cloud DB)
  if (db) {
    try {
      const snap = await getDocs(collection(db, 'products'));
      if (!snap.empty) {
        const firestoreList: Asset[] = [];
        snap.forEach((docSnap) => {
          const item = docSnap.data() as Asset;
          if (item && item.id && item.title) {
            firestoreList.push(item);
          }
        });
        if (firestoreList.length > 0) {
          return firestoreList;
        }
      }
    } catch (e) {
      console.warn('Firestore getProducts fallback:', e);
    }
  }

  // 2. Try GitHub raw (authoritative, persists across redeploys)
  try {
    const res = await fetch(`${GITHUB_RAW_URL}?t=${Date.now()}`, {
      next: { revalidate: 0 },
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (e) {}

  // 3. Fallback to local
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const content = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  return [];
}

// Helper to write locally
function writeLocal(products: Asset[]) {
  try {
    const dir = path.dirname(DATA_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(products, null, 2), 'utf-8');
  } catch (e) {
    console.error('Local write ignored (serverless):', e);
  }
}

// Helper to commit to GitHub repo for permanent persistence
async function syncToGitHub(
  products: Asset[],
  token?: string
): Promise<{ success: boolean; message: string; tokenMissing?: boolean }> {
  const ghToken = token || process.env.GITHUB_TOKEN;

  if (!ghToken || ghToken.trim() === '') {
    return {
      success: false,
      tokenMissing: true,
      message:
        'GitHub Token tidak ditemukan! Buka "Lihat Token GitHub" di admin panel dan masukkan token kamu, atau tambahkan GITHUB_TOKEN di Vercel Environment Variables.',
    };
  }

  try {
    const getRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`,
      {
        headers: {
          Authorization: `Bearer ${ghToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'ToolsDevMap-Admin',
        },
        cache: 'no-store',
      }
    );

    let sha: string | undefined = undefined;
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
    } else if (getRes.status === 401) {
      return {
        success: false,
        tokenMissing: true,
        message:
          'GitHub Token tidak valid atau sudah kadaluarsa! Perbarui token di bagian "Lihat Token GitHub" admin panel.',
      };
    }

    const contentBase64 = Buffer.from(JSON.stringify(products, null, 2)).toString('base64');
    const putRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${ghToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'ToolsDevMap-Admin',
        },
        body: JSON.stringify({
          message: `chore: update products catalog (${products.length} items) [skip ci]`,
          content: contentBase64,
          sha,
          branch: 'main',
        }),
      }
    );

    if (putRes.ok) {
      return {
        success: true,
        message: `Produk berhasil disimpan PERMANEN ke GitHub & Cloud! (${products.length} produk aktif)`,
      };
    } else {
      const err = ((await putRes.json().catch(() => ({}))) as any) || {};
      return {
        success: false,
        message: `Gagal sync ke GitHub: ${err.message || putRes.statusText}`,
      };
    }
  } catch (err: any) {
    return { success: false, message: `Error GitHub API: ${err.message}` };
  }
}

export async function GET() {
  const products = await getProducts();
  return NextResponse.json({
    success: true,
    total: products.length,
    data: products,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = body.token;

    // Handle Bulk Sync from Admin Browser
    if (body.bulkProducts && Array.isArray(body.bulkProducts)) {
      const bulkList: Asset[] = body.bulkProducts;

      // 1. Write each to Firestore
      if (db) {
        try {
          for (const item of bulkList) {
            await setDoc(doc(db, 'products', item.id), item);
          }
        } catch (e) {
          console.warn('Bulk Firestore write warning:', e);
        }
      }

      // 2. Write local
      writeLocal(bulkList);

      // 3. Commit all to GitHub
      const syncRes = await syncToGitHub(bulkList, token);

      return NextResponse.json({
        success: true,
        message: `Berhasil sinkronisasi ${bulkList.length} produk ke Cloud Firestore & GitHub!`,
        data: bulkList,
        syncedWithGitHub: syncRes.success,
      });
    }

    const productData = body.product;
    if (!productData || !productData.title) {
      return NextResponse.json(
        { success: false, error: 'Data produk tidak lengkap' },
        { status: 400 }
      );
    }

    const currentProducts = await getProducts();
    const existingIndex = currentProducts.findIndex((p) => p.id === productData.id);

    const nowIso = new Date().toISOString();
    const formattedProduct: Asset = {
      id: productData.id || `asset-${Date.now()}`,
      title: productData.title,
      description: productData.description || '',
      category: productData.category || 'layout-map',
      subcategory: productData.subcategory || 'General',
      format: productData.format || 'RBXM',
      thumbnail:
        productData.thumbnail ||
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
      fileName: productData.fileName,
      fileData: productData.fileData,
      robloxAssetId: productData.robloxAssetId,
      downloadUrl: productData.downloadUrl,
      luauCode: productData.luauCode,
      fileSize: productData.fileSize || '1.0 MB',
      creator: {
        name: productData.creatorName || 'Admin Riki',
        verified: true,
      },
      stats:
        existingIndex >= 0
          ? currentProducts[existingIndex].stats
          : { downloads: 0, favorites: 0, views: 1 },
      license: productData.license || 'Free Community Asset',
      tags: productData.tags || ['free', 'roblox'],
      updatedAt: nowIso,
    };

    let updatedList: Asset[];
    if (existingIndex >= 0) {
      updatedList = [...currentProducts];
      updatedList[existingIndex] = formattedProduct;
    } else {
      updatedList = [formattedProduct, ...currentProducts];
    }

    // 1. Save to Firestore (Cloud Database)
    if (db) {
      try {
        await setDoc(doc(db, 'products', formattedProduct.id), formattedProduct);
      } catch (e) {
        console.warn('Firestore setDoc failed:', e);
      }
    }

    // 2. Write local
    writeLocal(updatedList);

    // 3. Commit to GitHub
    const syncRes = await syncToGitHub(updatedList, token);

    return NextResponse.json({
      success: true,
      message: syncRes.message || 'Produk berhasil disimpan ke Cloud & GitHub!',
      data: updatedList,
      syncedWithGitHub: syncRes.success,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal menyimpan produk' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const token = request.headers.get('x-github-token') || undefined;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID produk tidak ditemukan' },
        { status: 400 }
      );
    }

    // 1. Delete from Firestore
    if (db) {
      try {
        await deleteDoc(doc(db, 'products', id));
      } catch (e) {
        console.warn('Firestore delete failed:', e);
      }
    }

    const currentProducts = await getProducts();
    const updatedList = currentProducts.filter((p) => p.id !== id);

    // 2. Write local
    writeLocal(updatedList);

    // 3. Commit to GitHub
    const syncRes = await syncToGitHub(updatedList, token);

    return NextResponse.json({
      success: true,
      message: 'Produk berhasil dihapus permanen dari Cloud & GitHub!',
      data: updatedList,
      syncedWithGitHub: syncRes.success,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal menghapus produk' },
      { status: 500 }
    );
  }
}
