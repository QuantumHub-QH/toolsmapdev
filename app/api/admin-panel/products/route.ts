export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Asset } from '@/types';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { fetchProductsFromGitHub, commitProductsToGitHub, getGitHubToken } from '@/lib/github';
import { verifyAdminSession } from '@/lib/security';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'products.json');

// Helper to read products
async function getProducts(): Promise<Asset[]> {
  // 1. Try Firestore Database (Realtime Cloud DB if configured)
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

  // 2. Try GitHub REST API (direct, no CDN cache)
  try {
    const ghProducts = await fetchProductsFromGitHub();
    if (ghProducts.length > 0) return ghProducts;
  } catch (e) {}

  // 3. Fallback to local file
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const content = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  return [];
}

// Helper to write locally (best-effort)
function writeLocal(products: Asset[]) {
  try {
    const dir = path.dirname(DATA_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(products, null, 2), 'utf-8');
  } catch (e) {
    // Ignored in serverless read-only
  }
}

// Helper to verify admin authorization
function isAuthorized(request: NextRequest, bodyToken?: string): boolean {
  // 1. Check HTTP-only cookie
  const cookieToken = request.cookies.get('admin_panel_auth')?.value;
  if (verifyAdminSession(cookieToken)) return true;

  // 2. Check Authorization Bearer header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (verifyAdminSession(bearer)) return true;
    if (bearer === getGitHubToken()) return true;
  }

  // 3. Check x-github-token or bodyToken against canonical token
  const tokenHeader = request.headers.get('x-github-token') || bodyToken;
  if (tokenHeader && tokenHeader.trim() === getGitHubToken()) {
    return true;
  }

  return false;
}

export async function GET() {
  const products = await getProducts();
  return NextResponse.json({
    success: true,
    data: products,
    count: products.length,
    timestamp: Date.now(),
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = body.token || request.headers.get('x-github-token');

    // Security Check: Block unauthorized mutations
    if (!isAuthorized(request, token)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Akses ditolak! Anda harus login sebagai admin.' },
        { status: 401 }
      );
    }

    // Handle Bulk Sync from Admin Browser
    if (body.bulkProducts && Array.isArray(body.bulkProducts)) {
      const bulkList: Asset[] = body.bulkProducts;

      // 1. Write each to Firestore if configured
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
      const syncRes = await commitProductsToGitHub(
        bulkList,
        token,
        `feat(catalog): bulk publish ${bulkList.length} products to public catalog [skip ci]`
      );

      if (!syncRes.success) {
        return NextResponse.json(
          { success: false, error: syncRes.message, data: bulkList },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Berhasil sinkronisasi ${bulkList.length} produk ke publik!`,
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

    // Read current catalog from GitHub/local
    const currentProducts = await getProducts();

    // Merge map: current server products + new product
    const productMap = new Map<string, Asset>();
    for (const p of currentProducts) {
      if (p && p.id) productMap.set(p.id, p);
    }

    if (Array.isArray(body.clientProducts)) {
      for (const cp of body.clientProducts) {
        if (cp && cp.id) productMap.set(cp.id, cp);
      }
    }

    const existingProduct = productMap.get(productData.id);

    const nowIso = new Date().toISOString();
    const formattedProduct: Asset = {
      id: productData.id || `asset-${Date.now()}`,
      title: (productData.title || '').trim(),
      description: (productData.description || '').trim(),
      category: productData.category || 'layout-map',
      subcategory: productData.subcategory?.trim() || 'General',
      format: productData.format || 'RBXM',
      thumbnail: productData.thumbnail || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
      fileName: productData.fileName,
      fileData: productData.fileData,
      robloxAssetId: productData.robloxAssetId?.trim(),
      downloadUrl: productData.downloadUrl?.trim(),
      luauCode: productData.luauCode?.trim(),
      fileSize: productData.fileSize || '1.0 MB',
      creator: {
        name: productData.creatorName || productData.creator?.name || 'Admin Riki',
        avatar: productData.creator?.avatar,
        verified: true,
      },
      tags: Array.isArray(productData.tags) && productData.tags.length > 0
        ? productData.tags
        : ['free', 'dev'],
      stats: existingProduct?.stats
        ? existingProduct.stats
        : { downloads: 0, favorites: 0, views: 1 },
      updatedAt: nowIso,
      license: productData.license || 'Free Community Asset',
    };

    // Insert or update in map
    productMap.set(formattedProduct.id, formattedProduct);

    // Turn map into list (newest first)
    const updatedList = Array.from(productMap.values());
    const finalList = [
      formattedProduct,
      ...updatedList.filter((p) => p.id !== formattedProduct.id),
    ];

    // 1. Save to Firestore if configured
    if (db) {
      try {
        await setDoc(doc(db, 'products', formattedProduct.id), formattedProduct);
      } catch (e) {
        console.warn('Firestore setDoc failed:', e);
      }
    }

    // 2. Write local
    writeLocal(finalList);

    // 3. Commit to GitHub
    const syncRes = await commitProductsToGitHub(
      finalList,
      token,
      `feat(catalog): add/update "${formattedProduct.title}" [skip ci]`
    );

    if (!syncRes.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Gagal menyimpan ke GitHub: ${syncRes.message}`,
          data: finalList,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: syncRes.message || 'Produk berhasil di-publish ke publik!',
      data: finalList,
      syncedWithGitHub: syncRes.success,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const token = searchParams.get('token') || request.headers.get('x-github-token');

    // Security Check: Block unauthorized deletions
    if (!isAuthorized(request, token || undefined)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Akses ditolak! Anda harus login sebagai admin.' },
        { status: 401 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID required' },
        { status: 400 }
      );
    }

    // 1. Delete from Firestore if configured
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
    const syncRes = await commitProductsToGitHub(
      updatedList,
      token || undefined,
      `chore(catalog): delete asset ${id} [skip ci]`
    );

    return NextResponse.json({
      success: true,
      message: 'Produk berhasil dihapus permanen dari Cloud & GitHub!',
      data: updatedList,
      syncedWithGitHub: syncRes.success,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
