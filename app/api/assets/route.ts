import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Asset, AssetCategory } from '@/types';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { fetchProductsFromGitHub } from '@/lib/github';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'products.json');

async function getLiveAssets(): Promise<Asset[]> {
  // 1. Try reading from Firebase Firestore (only if configured)
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
      console.warn('Firestore getLiveAssets fallback:', e);
    }
  }

  // 2. Try reading from GitHub REST API (direct, no CDN cache)
  try {
    const ghProducts = await fetchProductsFromGitHub();
    if (ghProducts.length > 0) {
      return ghProducts;
    }
  } catch (e) {
    console.warn('GitHub getLiveAssets fallback:', e);
  }

  // 3. Try reading from local file system
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const content = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}

  return [];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search')?.toLowerCase();

  const allAssets = await getLiveAssets();

  let filtered = allAssets;

  if (category && category !== 'all') {
    filtered = filtered.filter(
      (asset) => asset.category.toLowerCase() === category.toLowerCase()
    );
  }

  if (search) {
    filtered = filtered.filter(
      (asset) =>
        asset.title.toLowerCase().includes(search) ||
        asset.description.toLowerCase().includes(search) ||
        asset.tags.some((tag) => tag.toLowerCase().includes(search))
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: filtered,
      total: filtered.length,
      timestamp: Date.now(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
