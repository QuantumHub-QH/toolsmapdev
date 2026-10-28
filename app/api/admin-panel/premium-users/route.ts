import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin } from '@/lib/admin-auth';
import { PREMIUM_DURATIONS, PremiumDuration } from '@/lib/premium-config';
import { fetchPremiumUsers, grantPremiumUser, removePremiumUser } from '@/lib/premium';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DISCORD_ID_PATTERN = /^\d{17,20}$/;
const VALID_DURATIONS = new Set<string>(PREMIUM_DURATIONS.map((item) => item.value));

export async function GET(request: NextRequest) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const users = await fetchPremiumUsers();
    return NextResponse.json({ success: true, data: users }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Failed to load Premium users:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Gagal memuat daftar Premium.' },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const discordId = typeof body.discordId === 'string' ? body.discordId.trim() : '';
    const duration = body.duration;

    if (!DISCORD_ID_PATTERN.test(discordId)) {
      return NextResponse.json({ success: false, error: 'Discord ID harus berupa Snowflake 17–20 digit.' }, { status: 400 });
    }
    if (typeof duration !== 'string' || !VALID_DURATIONS.has(duration)) {
      return NextResponse.json({ success: false, error: 'Pilih masa Premium yang valid.' }, { status: 400 });
    }

    const user = await grantPremiumUser(discordId, duration as PremiumDuration);
    return NextResponse.json({ success: true, data: user }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Failed to grant Premium access:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Gagal memberi akses Premium.' },
      { status: 503 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const discordId = searchParams.get('discordId')?.trim() || '';
    if (!DISCORD_ID_PATTERN.test(discordId)) {
      return NextResponse.json({ success: false, error: 'Discord ID tidak valid.' }, { status: 400 });
    }

    await removePremiumUser(discordId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove Premium access:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Gagal menghapus akses Premium.' },
      { status: 503 }
    );
  }
}
