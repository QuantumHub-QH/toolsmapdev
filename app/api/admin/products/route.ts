import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ASSETS_DATA } from '@/lib/data';
import { Asset } from '@/types';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'products.json');
const GITHUB_REPO = 'gantengriki023-sudo/TOOLSDEVMAP';
const GITHUB_FILE_PATH = 'data/products.json';

// Helper to read local products
function readLocalProducts(): Asset[] {
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const content = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('Failed reading local products file:', e);
  }
  return ASSETS_DATA;
}

// Helper to write local products
function writeLocalProducts(products: Asset[]) {
  try {
    const dir = path.dirname(DATA_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(products, null, 2), 'utf-8');
  } catch (e) {
    console.error('Local write ignored (serverless read-only filesystem):', e);
  }
}

// Helper to commit to GitHub repo so data persists across all redeploys
async function commitToGitHub(products: Asset[], token?: string): Promise<{ success: boolean; message?: string }> {
  const ghToken = token || process.env.GITHUB_TOKEN;
  if (!ghToken) {
    return { success: false, message: 'No GitHub token configured in env' };
  }

  try {
    // 1. Get current file sha from GitHub
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
        message: `chore: update products database (${products.length} items) [skip ci]`,
        content: contentBase64,
        sha,
        branch: 'main',
      }),
    });

    if (putRes.ok) {
      return { success: true, message: 'Committed to GitHub successfully!' };
    } else {
      const err = await putRes.json();
      return { success: false, message: err.message || 'GitHub commit failed' };
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'GitHub API error' };
  }
}

export async function GET() {
  const products = readLocalProducts();
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

    const current = readLocalProducts();
    const now = new Date().toISOString().split('T')[0];

    let updatedList: Asset[];
    const existingIndex = current.findIndex((item) => item.id === product.id);

    if (existingIndex >= 0) {
      // Update existing product
      updatedList = [...current];
      updatedList[existingIndex] = {
        ...current[existingIndex],
        ...product,
        updatedAt: now,
      };
    } else {
      // Create new product
      const newProduct: Asset = {
        id: product.id || `asset-${Date.now()}`,
        title: product.title,
        category: product.category || 'models',
        subcategory: product.subcategory || 'General Props',
        description: product.description || '',
        thumbnail: product.thumbnail || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
        tags: Array.isArray(product.tags) ? product.tags : (product.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean),
        robloxAssetId: product.robloxAssetId || undefined,
        downloadUrl: product.downloadUrl || undefined,
        luauCode: product.luauCode || undefined,
        fileSize: product.fileSize || '1.0 MB',
        creator: {
          name: product.creatorName || 'Admin Riki',
          verified: true,
        },
        stats: {
          downloads: product.downloads || 0,
          favorites: product.favorites || 0,
          views: product.views || 0,
        },
        format: product.format || 'RBXM',
        license: product.license || 'Free Community Asset',
        updatedAt: now,
      };
      updatedList = [newProduct, ...current];
    }

    // Save locally
    writeLocalProducts(updatedList);

    // Commit to GitHub repo for 100% permanence across redeploys
    const gitHubResult = await commitToGitHub(updatedList, token);

    return NextResponse.json({
      success: true,
      message: gitHubResult.success 
        ? 'Produk berhasil disimpan dan disinkronkan ke GitHub (Aman dari redeploy Vercel)!' 
        : 'Produk berhasil disimpan lokal!',
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

    const current = readLocalProducts();
    const updatedList = current.filter((item) => item.id !== id);

    writeLocalProducts(updatedList);
    const gitHubResult = await commitToGitHub(updatedList, token);

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
