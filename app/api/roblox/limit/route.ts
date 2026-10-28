import { NextRequest, NextResponse } from 'next/server';
import { getDiscordSession } from '@/lib/discord-session';
import { getPremiumEntitlement } from '@/lib/premium';
import { DailyUploadLimitError, getDailyUsage, reserveDailyUploads } from '@/lib/upload-limits';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function unlimitedResponse(discordId: string) {
  return {
    success: true,
    discordId,
    limit: -1,
    used: 0,
    remaining: -1,
    unlimited: true,
  };
}

export async function GET(request: NextRequest) {
  const session = getDiscordSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Login Discord diperlukan.' }, { status: 401 });
  }

  try {
    const entitlement = await getPremiumEntitlement(session.id);
    if (entitlement.isPremium) {
      return NextResponse.json(unlimitedResponse(session.id), {
        headers: { 'Cache-Control': 'private, no-store' },
      });
    }

    const usage = await getDailyUsage(session.id);
    const remaining = Math.max(0, 10 - usage.used);
    return NextResponse.json({
      success: true,
      discordId: session.id,
      date: usage.date,
      limit: 10,
      used: usage.used,
      remaining,
      unlimited: false,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Upload quota lookup failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Gagal memeriksa kuota upload.' },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = getDiscordSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Login Discord diperlukan.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (body.discordId !== undefined && body.discordId !== session.id) {
      return NextResponse.json({ success: false, error: 'Discord ID tidak cocok dengan sesi aktif.' }, { status: 403 });
    }

    const count = Number(body.count ?? 1);
    if (!Number.isInteger(count) || count < 1 || count > 10) {
      return NextResponse.json({ success: false, error: 'Jumlah upload tidak valid.' }, { status: 400 });
    }

    const entitlement = await getPremiumEntitlement(session.id);
    if (entitlement.isPremium) {
      return NextResponse.json(unlimitedResponse(session.id), {
        headers: { 'Cache-Control': 'private, no-store' },
      });
    }

    const usage = await reserveDailyUploads(session.id, count);
    const remaining = Math.max(0, 10 - usage.used);
    return NextResponse.json({
      success: true,
      discordId: session.id,
      date: usage.date,
      limit: 10,
      used: usage.used,
      remaining,
      unlimited: false,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof DailyUploadLimitError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 429 });
    }
    console.error('Upload quota update failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Gagal memperbarui kuota upload.' },
      { status: 503 }
    );
  }
}
