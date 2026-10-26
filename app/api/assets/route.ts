import { NextRequest, NextResponse } from 'next/server';
import { ASSETS_DATA } from '@/lib/data';
import { AssetCategory } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as AssetCategory | null;
    const search = searchParams.get('search')?.toLowerCase() || '';
    const tag = searchParams.get('tag')?.toLowerCase();

    let filtered = [...ASSETS_DATA];

    if (category && category !== 'all') {
      filtered = filtered.filter((item) => item.category === category);
    }

    if (tag) {
      filtered = filtered.filter((item) => item.tags.includes(tag));
    }

    if (search) {
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(search) ||
          item.description.toLowerCase().includes(search) ||
          item.tags.some((t) => t.toLowerCase().includes(search)) ||
          item.creator.name.toLowerCase().includes(search)
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

    // Simulate database insertion response
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
