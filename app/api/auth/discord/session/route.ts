import { NextRequest, NextResponse } from 'next/server';
import { getDiscordSession } from '@/lib/discord-session';
import { getPremiumEntitlement } from '@/lib/premium';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const session = getDiscordSession(request);
  if (!session) return NextResponse.json({ user: null });

  let expiresAt: number | null = null;
  try {
    const entitlement = await getPremiumEntitlement(session.id);
    expiresAt = entitlement?.expiresAt ?? null;
  } catch (error) {
    console.error('Failed to check Discord premium entitlement:', error);
  }

  return NextResponse.json({
    user: {
      id: session.id,
      username: session.username,
      avatarUrl: session.avatarUrl,
      isAuthorized: true,
      joinedAt: new Date().toISOString(),
    },
    isPremium: expiresAt !== null,
    premiumExpiresAt: expiresAt,
  }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
