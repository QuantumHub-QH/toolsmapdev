import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';

export const DISCORD_SESSION_COOKIE = 'mchlern_discord_session';
export const DISCORD_OAUTH_STATE_COOKIE = 'mchlern_discord_oauth_state';

export interface DiscordSession {
  id: string;
  username: string;
  avatarUrl: string;
  expiresAt: number;
}

function getSessionSecret(): string {
  const secret = process.env.DISCORD_CLIENT_SECRET;
  if (!secret) throw new Error('DISCORD_CLIENT_SECRET belum dikonfigurasi di server.');
  return secret;
}

function sign(value: string): string {
  return createHmac('sha256', getSessionSecret()).update(value).digest('base64url');
}

export function createDiscordSessionToken(user: Omit<DiscordSession, 'expiresAt'>): string {
  const payload = Buffer.from(JSON.stringify({
    ...user,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyDiscordSessionToken(token?: string): DiscordSession | null {
  if (!token) return null;

  try {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;
    const expected = sign(payload);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;

    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as DiscordSession;
    if (
      typeof session.id !== 'string'
      || typeof session.username !== 'string'
      || typeof session.expiresAt !== 'number'
      || session.expiresAt <= Date.now()
    ) return null;

    return session;
  } catch {
    return null;
  }
}

export function getDiscordSession(request: NextRequest): DiscordSession | null {
  return verifyDiscordSessionToken(request.cookies.get(DISCORD_SESSION_COOKIE)?.value);
}
