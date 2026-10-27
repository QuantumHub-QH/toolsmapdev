export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { getLiveStats, recordVisitor } from '@/lib/stats';

export async function GET() {
  const stats = await getLiveStats();
  return NextResponse.json(
    {
      success: true,
      data: stats,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}

// POST: Record visitor session
export async function POST(request: NextRequest) {
  try {
    let isNewVisitor = true;
    try {
      const body = await request.json().catch(() => ({}));
      if (body.type === 'ping') {
        isNewVisitor = false;
      }
    } catch {}

    const updatedStats = await recordVisitor(isNewVisitor);

    return NextResponse.json({
      success: true,
      data: updatedStats,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
