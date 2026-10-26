import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Asset } from '@/types';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'products.json');
const GITHUB_REPO = 'QuantumHub-QH/mchlern';
const GITHUB_FILE_PATH = 'data/products.json';
const GITHUB_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/${GITHUB_FILE_PATH}`;

async function getLiveProducts(): Promise<Asset[]> {
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const content = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  try {
    const res = await fetch(`${GITHUB_RAW_URL}?t=${Date.now()}`, {
      next: { revalidate: 0 },
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) {}

  return [];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const assetId = body.id;
    const clientToken = body.token || request.headers.get('x-github-token') || process.env.GITHUB_TOKEN;

    if (!assetId) {
      return NextResponse.json({ success: false, error: 'Asset ID diperlukan' }, { status: 400 });
    }

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

    // Write locally
    try {
      const dir = path.dirname(DATA_FILE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(updatedProducts, null, 2), 'utf-8');
    } catch (e) {
      // serverless read-only fallback
    }

    // Background sync to GitHub if token available
    if (clientToken) {
      try {
        const getRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`, {
          headers: {
            Authorization: `Bearer ${clientToken}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'MapDev-Downloader',
          },
          cache: 'no-store',
        });

        let sha: string | undefined = undefined;
        if (getRes.ok) {
          const fileData = await getRes.json();
          sha = fileData.sha;
        }

        const contentBase64 = Buffer.from(JSON.stringify(updatedProducts, null, 2)).toString('base64');
        await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${clientToken}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'MapDev-Downloader',
          },
          body: JSON.stringify({
            message: `chore: increment download count for asset ${assetId} [skip ci]`,
            content: contentBase64,
            sha,
            branch: 'main',
          }),
        });
      } catch (err) {
        console.error('Failed to commit download increment to GitHub:', err);
      }
    }

    const totalDownloads = updatedProducts.reduce((acc, curr) => acc + (curr.stats?.downloads || 0), 0);

    return NextResponse.json({
      success: true,
      asset: updatedAsset,
      totalDownloads,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
