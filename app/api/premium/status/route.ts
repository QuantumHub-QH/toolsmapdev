import { NextRequest, NextResponse } from 'next/server';
import { getDiscordSession } from '@/lib/discord-session';
import { getPremiumEntitlement } from '@/lib/premium';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const session = getDiscordSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Login Discord diperlukan.' }, { status: 401 });
  }

  try {
    const entitlement = await getPremiumEntitlement(session.id);
    return NextResponse.json(entitlement, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Premium status lookup failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Gagal memeriksa status Premium.' },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
}
