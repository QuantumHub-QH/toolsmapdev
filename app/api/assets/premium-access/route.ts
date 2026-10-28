import { NextRequest, NextResponse } from 'next/server';
import { getDiscordSession } from '@/lib/discord-session';
import { getPremiumEntitlement, getPremiumProductRecord } from '@/lib/premium';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const session = getDiscordSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Login dengan Discord untuk mengakses produk premium.' }, { status: 401 });
  }

  try {
    const entitlement = await getPremiumEntitlement(session.id);
    if (!entitlement) {
      return NextResponse.json({ error: 'Premium tidak aktif atau sudah kedaluwarsa.' }, { status: 403 });
    }

    const body = await request.json();
    const productId = typeof body.productId === 'string' ? body.productId : '';
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(productId)) {
      return NextResponse.json({ error: 'ID produk tidak valid.' }, { status: 400 });
    }

    const record = await getPremiumProductRecord(productId);
    if (!record) {
      return NextResponse.json({ error: 'Data privat produk tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({
      robloxAssetId: record.robloxAssetId || null,
      downloadUrl: record.downloadUrl || null,
      luauCode: record.luauCode || null,
      fileName: record.fileName || null,
      hasPrivateFile: Boolean(record.filePath),
      premiumExpiresAt: entitlement.expiresAt,
    }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Failed to authorize premium asset access:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Gagal memverifikasi akses premium.',
    }, { status: 503 });
  }
}
