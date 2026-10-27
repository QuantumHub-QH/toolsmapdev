import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Asset } from '@/types';
import { commitProductsToGitHub } from '@/lib/github';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'products.json');
const GITHUB_REPO = 'QuantumHub-QH/mchlern';
const GITHUB_FILE_PATH = 'data/products.json';
const GITHUB_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/${GITHUB_FILE_PATH}`;

async function getLiveProducts(): Promise<Asset[]> {
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

  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const content = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  return [];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const assetId = body.id;
    const action = body.action || 'like'; // 'like' or 'unlike'

    if (!assetId) {
      return NextResponse.json({ success: false, error: 'Asset ID diperlukan' }, { status: 400 });
    }

    const products = await getLiveProducts();
    let updatedAsset: Asset | null = null;

    const updatedProducts = products.map((item) => {
      if (item.id === assetId) {
        const currentFavs = item.stats?.favorites || 0;
        const newFavs = action === 'like' ? currentFavs + 1 : Math.max(0, currentFavs - 1);
        updatedAsset = {
          ...item,
          stats: {
            ...item.stats,
            favorites: newFavs,
          },
        };
        return updatedAsset;
      }
      return item;
    });

    if (!updatedAsset) {
      return NextResponse.json({ success: false, error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    // Write locally
    try {
      const dir = path.dirname(DATA_FILE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(updatedProducts, null, 2), 'utf-8');
    } catch (e) {}

    const syncResult = await commitProductsToGitHub(
      updatedProducts,
      `chore: update favorites count for asset ${assetId} [skip ci]`
    );
    if (!syncResult.success) console.error('Failed to commit favorites to GitHub:', syncResult.message);

    return NextResponse.json({
      success: true,
      asset: updatedAsset,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
