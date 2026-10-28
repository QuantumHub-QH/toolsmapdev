import { NextRequest, NextResponse } from 'next/server';
import { getDiscordSession } from '@/lib/discord-session';
import { getAdminStorage } from '@/lib/firebase-admin';
import { getPremiumEntitlement, getPremiumProductRecord } from '@/lib/premium';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const session = getDiscordSession(request);
  if (!session) return NextResponse.json({ error: 'Login Discord diperlukan.' }, { status: 401 });

  const productId = request.nextUrl.searchParams.get('id') || '';
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(productId)) {
    return NextResponse.json({ error: 'ID produk tidak valid.' }, { status: 400 });
  }

  try {
    const entitlement = await getPremiumEntitlement(session.id);
    if (!entitlement) return NextResponse.json({ error: 'Premium tidak aktif atau sudah kedaluwarsa.' }, { status: 403 });

    const record = await getPremiumProductRecord(productId);
    if (!record?.filePath) return NextResponse.json({ error: 'File premium tidak ditemukan.' }, { status: 404 });

    const [fileBuffer] = await getAdminStorage().bucket().file(record.filePath).download();
    const filename = (record.fileName || 'premium-asset.bin').replace(/["\r\n]/g, '_');
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': record.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Failed to download premium asset:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Gagal mengunduh produk premium.',
    }, { status: 503 });
  }
}
