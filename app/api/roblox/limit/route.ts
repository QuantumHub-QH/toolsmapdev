import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getGitHubToken } from '@/lib/github';

const LIMITS_FILE_PATH = path.join(process.cwd(), 'data', 'limits.json');
const GITHUB_REPO = 'QuantumHub-QH/mchlern';
const GITHUB_FILE_PATH = 'data/limits.json';
const DAILY_LIMIT = 10;

function getTodayString(): string {
  // Use Jakarta WIB / UTC+7 or current local date YYYY-MM-DD
  const now = new Date();
  return now.toISOString().split('T')[0];
}

async function getLimitsMap(): Promise<Record<string, { date: string; used: number }>> {
  const token = getGitHubToken();
  if (token) {
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}?ref=main&t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3.raw',
          'User-Agent': 'MapDev-Limits',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data === 'object' && data !== null) return data;
      }
    } catch (error) {
      console.warn('GitHub limits fetch warning:', error);
    }
  }

  try {
    if (fs.existsSync(LIMITS_FILE_PATH)) {
      const content = fs.readFileSync(LIMITS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (typeof parsed === 'object' && parsed !== null) return parsed;
    }
  } catch (e) {}

  return {};
}

function writeLimitsLocal(data: Record<string, { date: string; used: number }>) {
  try {
    const dir = path.dirname(LIMITS_FILE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LIMITS_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {}
}

async function syncLimitsToGitHub(data: Record<string, { date: string; used: number }>) {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) return;
  try {
    const getRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'MapDev-Limits',
      },
      cache: 'no-store',
    });

    let sha: string | undefined = undefined;
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
    }

    const contentBase64 = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
    await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'MapDev-Limits',
      },
      body: JSON.stringify({
        message: `chore: update user daily upload limits [skip ci]`,
        content: contentBase64,
        sha,
        branch: 'main',
      }),
    });
  } catch (err) {
    console.error('Failed to sync limits to GitHub:', err);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const discordId = searchParams.get('discordId');

  if (!discordId) {
    return NextResponse.json({ success: false, error: 'Discord ID diperlukan' }, { status: 400 });
  }

  const today = getTodayString();
  const limitsMap = await getLimitsMap();
  const record = limitsMap[discordId];

  let used = 0;
  if (record && record.date === today) {
    used = record.used || 0;
  }

  const remaining = Math.max(0, DAILY_LIMIT - used);

  return NextResponse.json({
    success: true,
    discordId,
    date: today,
    limit: DAILY_LIMIT,
    used,
    remaining,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const discordId = body.discordId;
    const count = parseInt(body.count || 1, 10);
    if (!discordId) {
      return NextResponse.json({ success: false, error: 'Discord ID diperlukan' }, { status: 400 });
    }

    const today = getTodayString();
    const limitsMap = await getLimitsMap();
    const currentRecord = limitsMap[discordId];

    let currentUsed = 0;
    if (currentRecord && currentRecord.date === today) {
      currentUsed = currentRecord.used || 0;
    }

    const newUsed = currentUsed + count;
    limitsMap[discordId] = {
      date: today,
      used: newUsed,
    };

    writeLimitsLocal(limitsMap);
    await syncLimitsToGitHub(limitsMap);

    const remaining = Math.max(0, DAILY_LIMIT - newUsed);

    return NextResponse.json({
      success: true,
      discordId,
      date: today,
      limit: DAILY_LIMIT,
      used: newUsed,
      remaining,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
