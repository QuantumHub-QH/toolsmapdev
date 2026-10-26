import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Asset } from '@/types';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'products.json');
const GITHUB_REPO = 'QuantumHub-QH/mchlern';
const GITHUB_FILE_PATH = 'data/products.json';
const GITHUB_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/${GITHUB_FILE_PATH}`;

// Helper to read products
async function getProducts(): Promise<Asset[]> {
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const content = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    // fallback
  }

  try {
    const res = await fetch(`${GITHUB_RAW_URL}?t=${Date.now()}`, {
      next: { revalidate: 0 },
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    // fallback
  }

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

// Helper to commit to GitHub repo for 100% permanent persistence
async function syncToGitHub(products: Asset[], token?: string): Promise<{ success: boolean; message?: string }> {
  const ghToken = token || process.env.GITHUB_TOKEN;
  if (!ghToken) {
    return { success: false, message: 'Simpan lokal berhasil. (Tambahkan GITHUB_TOKEN di Vercel env untuk auto-commit ke GitHub).' };
  }

  try {
    // 1. Get current sha
    const getRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`, {
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'ToolsDevMap-Admin',
      },
      cache: 'no-store',
    });

    let sha: string | undefined = undefined;
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
    }

    // 2. Put updated contents
    const contentBase64 = Buffer.from(JSON.stringify(products, null, 2)).toString('base64');
    const putRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`, {
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
    });

    if (putRes.ok) {
      return { success: true, message: 'Produk berhasil disimpan dan disinkronkan ke GitHub (Aman dari redeploy Vercel)!' };
    } else {
      const err = await putRes.json();
      return { success: false, message: err.message || 'Gagal commit ke GitHub' };
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'Error GitHub API' };
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
    const { product, token } = body;

    if (!product || !product.title || !product.category) {
      return NextResponse.json(
        { success: false, error: 'Judul dan Kategori produk wajib diisi!' },
        { status: 400 }
      );
    }

    const current = await getProducts();
    const now = new Date().toISOString().split('T')[0];

    let updatedList: Asset[];
    const existingIndex = current.findIndex((item) => item.id === product.id);

    if (existingIndex >= 0) {
      updatedList = [...current];
      updatedList[existingIndex] = {
        ...current[existingIndex],
        ...product,
        updatedAt: now,
      };
    } else {
      const newProduct: Asset = {
        id: product.id || `asset-${Date.now()}`,
        title: product.title,
        category: product.category,
        subcategory: product.subcategory || 'General',
        description: product.description || '',
        thumbnail: product.thumbnail || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
        tags: Array.isArray(product.tags) ? product.tags : (product.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean),
        robloxAssetId: product.robloxAssetId || undefined,
        downloadUrl: product.downloadUrl || undefined,
        fileName: product.fileName || undefined,
        fileData: product.fileData || undefined,
        luauCode: product.luauCode || undefined,
        fileSize: product.fileSize || '1.0 MB',
        creator: {
          name: product.creatorName || 'Admin Riki',
          verified: true,
        },
        stats: { downloads: 0, favorites: 0, views: 0 },
        format: product.format || 'RBXM',
        license: product.license || 'Free Community Asset',
        updatedAt: now,
      };
      updatedList = [newProduct, ...current];
    }

    writeLocal(updatedList);
    const gitHubResult = await syncToGitHub(updatedList, token);

    return NextResponse.json({
      success: true,
      message: gitHubResult.message || 'Produk berhasil disimpan!',
      githubSync: gitHubResult,
      total: updatedList.length,
      data: updatedList,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menyimpan produk' },
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
      return NextResponse.json({ success: false, error: 'Product ID required' }, { status: 400 });
    }

    const current = await getProducts();
    const updatedList = current.filter((item) => item.id !== id);

    writeLocal(updatedList);
    const gitHubResult = await syncToGitHub(updatedList, token);

    return NextResponse.json({
      success: true,
      message: 'Produk berhasil dihapus!',
      githubSync: gitHubResult,
      total: updatedList.length,
      data: updatedList,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menghapus produk' },
      { status: 500 }
    );
  }
}
