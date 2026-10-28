import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Asset } from '@/types';
import { commitProductsToGitHub, fetchProductsFromGitHub } from '@/lib/github';
import { getDiscordSession } from '@/lib/discord-session';
import { sanitizePublicAsset } from '@/lib/assets';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'products.json');

async function getLiveProducts(): Promise<Asset[]> {
  try {
    const products = await fetchProductsFromGitHub();
    if (products.length > 0) return products;
  } catch (error) {
    console.warn('GitHub favorite catalog fallback:', error);
  }

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
  if (!getDiscordSession(request)) {
    return NextResponse.json(
      { success: false, error: 'Login Discord diperlukan.' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

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
      asset: sanitizePublicAsset(updatedAsset),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
