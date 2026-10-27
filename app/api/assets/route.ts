import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Asset, AssetCategory } from '@/types';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'products.json');
const GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/QuantumHub-QH/mchlern/main/data/products.json';

async function getLiveAssets(): Promise<Asset[]> {
  // 1. Try reading from Firebase Firestore (Cloud Database)
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

  // 2. Try reading from GitHub raw URL (most up-to-date across serverless instances)
  try {
    const res = await fetch(`${GITHUB_RAW_URL}?t=${Date.now()}`, {
      next: { revalidate: 0 },
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (e) {
    // ignore and fallback
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
  } catch (e) {
    // ignore and fallback
  }

  return [];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as AssetCategory | null;
    const search = searchParams.get('search')?.toLowerCase() || '';
    const tag = searchParams.get('tag')?.toLowerCase();

    const assets = await getLiveAssets();
    let filtered = [...assets];

    if (category && category !== 'all') {
      filtered = filtered.filter((item) => item.category === category);
    }

    if (tag) {
      filtered = filtered.filter((item) => item.tags && item.tags.includes(tag));
    }

    if (search) {
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(search) ||
          item.description.toLowerCase().includes(search) ||
          (item.tags && item.tags.some((t) => t.toLowerCase().includes(search))) ||
          (item.creator && item.creator.name.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({
      success: true,
      total: filtered.length,
      data: filtered,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch assets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.title || !body.category || !body.creatorName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields (title, category, creatorName)' },
        { status: 400 }
      );
    }

    const newSubmission = {
      id: `custom-${Date.now()}`,
      title: body.title,
      category: body.category,
      description: body.description || '',
      assetIdOrUrl: body.assetIdOrUrl || '',
      creatorName: body.creatorName,
      status: 'pending_review',
      submittedAt: new Date().toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        message: 'Asset submitted successfully! Pending verification by community moderators.',
        data: newSubmission,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to process submission' },
      { status: 500 }
    );
  }
}
