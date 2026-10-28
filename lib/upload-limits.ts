import { GITHUB_REPO, getGitHubToken } from '@/lib/github';

const LIMITS_PATH = 'data/limits.json';
const DAILY_LIMIT = 10;
const FILE_ENDPOINT = `https://api.github.com/repos/${GITHUB_REPO}/contents/${LIMITS_PATH}`;

interface DailyUsage {
  date: string;
  used: number;
}

type UsageMap = Record<string, DailyUsage>;

export class DailyUploadLimitError extends Error {
  constructor() {
    super('Kuota upload gratis hari ini sudah habis (10/10).');
    this.name = 'DailyUploadLimitError';
  }
}

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getHeaders(accept = 'application/vnd.github+json'): HeadersInit {
  const token = getGitHubToken();
  if (!token) throw new Error('GITHUB_TOKEN belum dikonfigurasi di environment server.');

  return {
    Authorization: `Bearer ${token}`,
    Accept: accept,
    'User-Agent': 'MapDev-Limits',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function parseUsageMap(value: unknown): UsageMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Format data kuota upload di GitHub tidak valid.');
  }

  const usage: UsageMap = {};
  for (const [discordId, record] of Object.entries(value)) {
    if (
      record
      && typeof record === 'object'
      && typeof record.date === 'string'
      && Number.isInteger(record.used)
      && record.used >= 0
    ) {
      usage[discordId] = { date: record.date, used: record.used };
    }
  }
  return usage;
}

export async function getDailyUsage(discordId: string): Promise<DailyUsage> {
  const response = await fetch(`${FILE_ENDPOINT}?ref=main&t=${Date.now()}`, {
    headers: getHeaders('application/vnd.github.raw+json'),
    cache: 'no-store',
  });

  if (response.status === 404) return { date: getTodayString(), used: 0 };
  if (!response.ok) throw new Error(`Gagal membaca kuota upload dari GitHub (HTTP ${response.status}).`);

  const usageMap = parseUsageMap(await response.json());
  const record = usageMap[discordId];
  if (!record || record.date !== getTodayString()) return { date: getTodayString(), used: 0 };
  return record;
}

async function updateDailyUsage(discordId: string, delta: number, enforceLimit: boolean): Promise<DailyUsage> {
  const headers = getHeaders();
  const today = getTodayString();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const currentResponse = await fetch(FILE_ENDPOINT, {
      headers,
      cache: 'no-store',
    });

    let sha: string | undefined;
    let usageMap: UsageMap = {};
    if (currentResponse.status !== 404) {
      if (!currentResponse.ok) {
        throw new Error(`Gagal membaca kuota upload (HTTP ${currentResponse.status}).`);
      }

      const file = await currentResponse.json();
      sha = typeof file.sha === 'string' ? file.sha : undefined;
      const content = Buffer.from(String(file.content || '').replace(/\s/g, ''), 'base64').toString('utf8');
      usageMap = parseUsageMap(JSON.parse(content));
    }

    const current = usageMap[discordId];
    const used = current?.date === today ? current.used : 0;
    if (enforceLimit && used + delta > DAILY_LIMIT) throw new DailyUploadLimitError();

    const nextUsage = { date: today, used: Math.max(0, used + delta) };
    usageMap[discordId] = nextUsage;
    const response = await fetch(FILE_ENDPOINT, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'chore(limits): update daily upload usage [skip ci]',
        content: Buffer.from(JSON.stringify(usageMap, null, 2)).toString('base64'),
        sha,
        branch: 'main',
      }),
    });

    if (response.ok) return nextUsage;
    if ((response.status === 409 || response.status === 422) && attempt < 4) continue;

    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Gagal menyimpan kuota upload (HTTP ${response.status}).`);
  }

  throw new Error('Data kuota terus berubah. Coba upload kembali.');
}

export function reserveDailyUploads(discordId: string, count = 1): Promise<DailyUsage> {
  return updateDailyUsage(discordId, count, true);
}

export async function releaseDailyUpload(discordId: string, date: string): Promise<void> {
  if (date !== getTodayString()) return;
  await updateDailyUsage(discordId, -1, false);
}
