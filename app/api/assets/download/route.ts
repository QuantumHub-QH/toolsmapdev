import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Asset } from '@/types';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { fetchProductsFromGitHub, commitProductsToGitHub } from '@/lib/github';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'products.json');

async function getLiveProducts(): Promise<Asset[]> {
  // 1. Try direct GitHub API (live, uncached)
  try {
    const gh = await fetchProductsFromGitHub();
    if (gh.length > 0) return gh;
  } catch (e) {}

  // 2. Try local file
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

    if (!assetId) {
      return NextResponse.json({ success: false, error: 'Asset ID diperlukan' }, { status: 400 });
    }

    // 1. Update Firestore if configured
    if (db) {
      try {
        await updateDoc(doc(db, 'products', assetId), {
          'stats.downloads': increment(1),
        });
      } catch (e) {
        console.warn('Firestore download increment warning:', e);
      }
    }

    // 2. Read current products and update local & GitHub
    const products = await getLiveProducts();
    let updatedAsset: Asset | null = null;

    const updatedProducts = products.map((item) => {
      if (item.id === assetId) {
        const currentDownloads = item.stats?.downloads || 0;
        updatedAsset = {
          ...item,
          stats: {
            ...item.stats,
            downloads: currentDownloads + 1,
          },
        };
        return updatedAsset;
      }
      return item;
    });

    // 3. Write locally
    try {
      const dir = path.dirname(DATA_FILE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(updatedProducts, null, 2), 'utf-8');
    } catch (e) {}

    // 4. Asynchronously commit incremented count to GitHub
    commitProductsToGitHub(
      updatedProducts,
      undefined,
      `chore(downloads): increment download count for asset ${assetId} [skip ci]`
    ).catch((err) => {
      console.warn('Failed background GitHub download commit:', err);
    });

    const totalDownloads = updatedProducts.reduce(
      (acc, curr) => acc + (curr.stats?.downloads || 0),
      0
    );

    return NextResponse.json({
      success: true,
      asset: updatedAsset,
      totalDownloads,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
