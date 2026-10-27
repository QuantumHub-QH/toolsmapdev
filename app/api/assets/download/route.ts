export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Asset } from '@/types';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { commitStatsToGitHub } from '@/lib/github';
import { getLiveStats, writeLocalStats } from '@/lib/stats';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'products.json');

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

    // 2. Update Global Stats Store
    const stats = await getLiveStats();
    const currentAssetDl = stats.downloads[assetId] || 0;
    const newAssetDl = currentAssetDl + 1;
    const newTotalDl = stats.totalDownloads + 1;

    const updatedStats = {
      ...stats,
      totalDownloads: newTotalDl,
      downloads: {
        ...stats.downloads,
        [assetId]: newAssetDl,
      },
      updatedAt: new Date().toISOString(),
    };

    writeLocalStats(updatedStats);

    // Fast sync to GitHub stats.json
    commitStatsToGitHub(updatedStats).catch((err) => {
      console.warn('Failed background GitHub download stats commit:', err);
    });

    // 3. Best effort update local products.json if it exists
    try {
      if (fs.existsSync(DATA_FILE_PATH)) {
        const content = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
        const products: Asset[] = JSON.parse(content);
        if (Array.isArray(products)) {
          const updatedProducts = products.map((item) => {
            if (item.id === assetId) {
              return {
                ...item,
                stats: {
                  ...item.stats,
                  downloads: (item.stats?.downloads || 0) + 1,
                },
              };
            }
            return item;
          });
          fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(updatedProducts, null, 2), 'utf-8');
        }
      }
    } catch (e) {}

    return NextResponse.json({
      success: true,
      totalDownloads: newTotalDl,
      assetDownloads: newAssetDl,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
