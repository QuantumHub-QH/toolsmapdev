import { NextRequest, NextResponse } from 'next/server';
import { getDiscordSession } from '@/lib/discord-session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const session = getDiscordSession(request);
  if (!session) return NextResponse.json({ user: null });

  return NextResponse.json({
    user: {
      id: session.id,
      username: session.username,
      avatarUrl: session.avatarUrl,
      isAuthorized: true,
      joinedAt: new Date().toISOString(),
    },
  }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
