import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { verifyAdminSession } from '@/lib/security';
import { isValidDiscordId } from '@/lib/premium';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isAdmin(request: NextRequest): boolean {
  const cookie = request.cookies.get('admin_panel_auth')?.value;
  const authorization = request.headers.get('authorization');
  const bearer = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : null;
  return verifyAdminSession(cookie) || verifyAdminSession(bearer);
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const snapshot = await getAdminFirestore().collection('premiumEntitlements').get();
    const users = snapshot.docs.map((document) => {
      const data = document.data();
      const expiresAt = data.expiresAt instanceof Timestamp ? data.expiresAt.toMillis() : 0;
      return { discordId: document.id, expiresAt };
    }).filter((user) => user.expiresAt > Date.now());
    return NextResponse.json({ users }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Failed to load premium users:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Gagal memuat data premium.',
    }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const discordId = typeof body.discordId === 'string' ? body.discordId.trim() : '';
    const durationDays = Number(body.durationDays);
    if (!isValidDiscordId(discordId)) {
      return NextResponse.json({ error: 'Discord ID harus berupa ID numerik yang valid.' }, { status: 400 });
    }
    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650) {
      return NextResponse.json({ error: 'Durasi premium harus 1 sampai 3650 hari.' }, { status: 400 });
    }

    const reference = getAdminFirestore().collection('premiumEntitlements').doc(discordId);
    const current = await reference.get();
    const currentExpiry = current.data()?.expiresAt;
    const existingExpiry = currentExpiry instanceof Timestamp ? currentExpiry.toMillis() : 0;
    const expiresAt = Math.max(Date.now(), existingExpiry) + durationDays * 24 * 60 * 60 * 1000;
    await reference.set({
      discordId,
      expiresAt: Timestamp.fromMillis(expiresAt),
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({ success: true, user: { discordId, expiresAt } });
  } catch (error) {
    console.error('Failed to grant premium access:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Gagal menambahkan premium.',
    }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const discordId = request.nextUrl.searchParams.get('discordId') || '';
  if (!isValidDiscordId(discordId)) {
    return NextResponse.json({ error: 'Discord ID harus berupa ID numerik yang valid.' }, { status: 400 });
  }

  try {
    await getAdminFirestore().collection('premiumEntitlements').doc(discordId).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to revoke premium access:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Gagal mencabut premium.',
    }, { status: 503 });
  }
}
