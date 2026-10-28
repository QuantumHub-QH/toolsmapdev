import { GITHUB_REPO, getGitHubToken } from '@/lib/github';
import { PremiumDuration } from '@/lib/premium-config';

const PREMIUM_USERS_PATH = 'data/premium-users.json';
const GITHUB_API_BASE = `https://api.github.com/repos/${GITHUB_REPO}/contents/${PREMIUM_USERS_PATH}`;

export interface PremiumUser {
  discordId: string;
  grantedAt: string;
  expiresAt: string;
}

export interface PremiumEntitlement {
  isPremium: boolean;
  expiresAt: string | null;
}

function getHeaders(accept = 'application/vnd.github+json'): HeadersInit {
  const token = getGitHubToken();
  if (!token) throw new Error('GITHUB_TOKEN belum dikonfigurasi di environment server.');

  return {
    Authorization: `Bearer ${token}`,
    Accept: accept,
    'User-Agent': 'MapDev-Hub',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function isPremiumUser(value: unknown): value is PremiumUser {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.discordId === 'string'
    && typeof record.grantedAt === 'string'
    && typeof record.expiresAt === 'string'
    && Number.isFinite(Date.parse(record.expiresAt));
}

export async function fetchPremiumUsers(): Promise<PremiumUser[]> {
  const response = await fetch(`${GITHUB_API_BASE}?ref=main&t=${Date.now()}`, {
    headers: getHeaders('application/vnd.github.raw+json'),
    cache: 'no-store',
  });

  if (response.status === 404) return [];
  if (!response.ok) {
    throw new Error(`Gagal membaca data Premium dari GitHub (HTTP ${response.status}).`);
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error('Format data Premium di GitHub tidak valid.');
  return data.filter(isPremiumUser);
}

export async function getPremiumEntitlement(discordId: string): Promise<PremiumEntitlement> {
  const users = await fetchPremiumUsers();
  const user = users.find((entry) => entry.discordId === discordId);
  const isPremium = Boolean(user && Date.parse(user.expiresAt) > Date.now());
  return {
    isPremium,
    expiresAt: isPremium ? user!.expiresAt : null,
  };
}

function addDuration(start: Date, duration: PremiumDuration): Date {
  if (duration === '7d') {
    const result = new Date(start);
    result.setUTCDate(result.getUTCDate() + 7);
    return result;
  }

  const months = duration === '1y' ? 12 : Number.parseInt(duration, 10);
  const result = new Date(start);
  const targetMonth = result.getUTCMonth() + months;
  const targetYear = result.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  result.setUTCDate(1);
  result.setUTCFullYear(targetYear, normalizedMonth, Math.min(start.getUTCDate(), lastDay));
  return result;
}

async function writePremiumUsers(update: (users: PremiumUser[]) => PremiumUser[]): Promise<PremiumUser[]> {
  const tokenHeaders = getHeaders();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const currentResponse = await fetch(GITHUB_API_BASE, {
      headers: tokenHeaders,
      cache: 'no-store',
    });

    let sha: string | undefined;
    let users: PremiumUser[] = [];

    if (currentResponse.status === 404) {
      users = [];
    } else {
      if (!currentResponse.ok) {
        throw new Error(`Gagal membaca daftar Premium (HTTP ${currentResponse.status}).`);
      }

      const file = await currentResponse.json();
      sha = typeof file.sha === 'string' ? file.sha : undefined;
      const content = Buffer.from(String(file.content || '').replace(/\s/g, ''), 'base64').toString('utf8');
      const parsed: unknown = JSON.parse(content);
      if (!Array.isArray(parsed)) throw new Error('Format daftar Premium di GitHub tidak valid.');
      users = parsed.filter(isPremiumUser);
    }

    const nextUsers = update(users);
    const response = await fetch(GITHUB_API_BASE, {
      method: 'PUT',
      headers: { ...tokenHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'chore(premium): update Discord access list [skip ci]',
        content: Buffer.from(JSON.stringify(nextUsers, null, 2)).toString('base64'),
        sha,
        branch: 'main',
      }),
    });

    if (response.ok) return nextUsers;
    if ((response.status === 409 || response.status === 422) && attempt < 3) continue;

    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Gagal menyimpan daftar Premium (HTTP ${response.status}).`);
  }

  throw new Error('Data Premium terus berubah. Coba ulangi beberapa saat lagi.');
}

export async function grantPremiumUser(discordId: string, duration: PremiumDuration): Promise<PremiumUser> {
  const now = new Date();
  let updatedUser: PremiumUser | undefined;

  await writePremiumUsers((users) => {
    const existing = users.find((entry) => entry.discordId === discordId);
    const existingExpiry = existing ? Date.parse(existing.expiresAt) : 0;
    const startsAt = new Date(Math.max(now.getTime(), existingExpiry));
    updatedUser = {
      discordId,
      grantedAt: now.toISOString(),
      expiresAt: addDuration(startsAt, duration).toISOString(),
    };

    return [...users.filter((entry) => entry.discordId !== discordId), updatedUser];
  });

  if (!updatedUser) throw new Error('Gagal memperbarui akses Premium.');
  return updatedUser;
}

export async function removePremiumUser(discordId: string): Promise<void> {
  await writePremiumUsers((users) => users.filter((entry) => entry.discordId !== discordId));
}
