import { Asset } from '@/types';

export const GITHUB_REPO = 'QuantumHub-QH/mchlern';
export const GITHUB_FILE_PATH = 'data/products.json';
export const GITHUB_STATS_PATH = 'data/stats.json';
export const GITHUB_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/${GITHUB_FILE_PATH}`;

export interface GlobalStats {
  totalVisitors: number;
  totalDownloads: number;
  downloads: Record<string, number>;
  updatedAt: string;
}

export function getGitHubToken(): string {
  return process.env.GITHUB_TOKEN?.trim() || '';
}

/**
 * Fetch live products directly from GitHub REST API (no CDN cache delay)
 */
export async function fetchProductsFromGitHub(): Promise<Asset[]> {
  const token = getGitHubToken();

  // 1. First attempt: Direct GitHub API with raw accept (instant, zero CDN cache)
  if (token) {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}?ref=main&t=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3.raw',
            'User-Agent': 'MapDev-Hub',
          },
          cache: 'no-store',
        }
      );
      if (res.ok) {
        const text = await res.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Direct GitHub API fetch warning:', e);
    }
  }

  // 2. Second attempt: GitHub Raw CDN fallback
  try {
    const rawRes = await fetch(`${GITHUB_RAW_URL}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
    if (rawRes.ok) {
      const parsed = await rawRes.json();
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('GitHub Raw CDN fetch warning:', e);
  }

  return [];
}

/**
 * Commit products array directly to GitHub repository data/products.json
 */
export async function commitProductsToGitHub(
  products: Asset[],
  commitMsg?: string
): Promise<{ success: boolean; message: string }> {
  const token = getGitHubToken();

  if (!token) {
    return {
      success: false,
      message: 'GITHUB_TOKEN belum diatur pada environment server Vercel.',
    };
  }

  const endpoint = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
  const contentBase64 = Buffer.from(JSON.stringify(products, null, 2)).toString('base64');
  const message = commitMsg || `chore(products): update catalog (${products.length} products) [skip ci]`;

  // Helper function to attempt write with current SHA
  async function attemptWrite(): Promise<{ success: boolean; message: string; status?: number }> {
    const getRes = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'MapDev-Hub',
      },
      cache: 'no-store',
    });

    let sha: string | undefined = undefined;
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
    }

    const putRes = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'MapDev-Hub',
      },
      body: JSON.stringify({
        message,
        content: contentBase64,
        sha,
        branch: 'main',
      }),
    });

    if (putRes.ok) {
      return {
        success: true,
        message: `Berhasil disimpan permanen ke GitHub! (${products.length} produk aktif)`,
      };
    }

    const err = ((await putRes.json().catch(() => ({}))) as any) || {};
    return {
      success: false,
      message: err.message || putRes.statusText,
      status: putRes.status,
    };
  }

  try {
    const firstAttempt = await attemptWrite();
    if (firstAttempt.success) return firstAttempt;

    // If 409 conflict, wait 500ms and retry once with fresh SHA
    if (firstAttempt.status === 409) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return await attemptWrite();
    }

    return firstAttempt;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Gagal terhubung ke GitHub API',
    };
  }
}

/**
 * Fetch global stats (visitors, downloads) directly from GitHub
 */
export async function fetchStatsFromGitHub(): Promise<GlobalStats> {
  const token = getGitHubToken();

  if (token) {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_STATS_PATH}?ref=main&t=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3.raw',
            'User-Agent': 'MapDev-Hub',
          },
          cache: 'no-store',
        }
      );
      if (res.ok) {
        const text = await res.text();
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed.totalVisitors === 'number') {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Direct GitHub API stats fetch warning:', e);
    }
  }

  // Fallback: try raw url
  try {
    const rawRes = await fetch(`https://raw.githubusercontent.com/${GITHUB_REPO}/main/${GITHUB_STATS_PATH}?t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (rawRes.ok) {
      const parsed = await rawRes.json();
      if (parsed && typeof parsed.totalVisitors === 'number') {
        return parsed;
      }
    }
  } catch (e) {}

  return {
    totalVisitors: 142,
    totalDownloads: 36,
    downloads: {},
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Commit global stats (visitors, downloads) to GitHub
 */
export async function commitStatsToGitHub(
  stats: GlobalStats
): Promise<{ success: boolean; message: string }> {
  const token = getGitHubToken();

  if (!token) {
    return { success: false, message: 'GITHUB_TOKEN belum diatur pada environment server Vercel.' };
  }

  const endpoint = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_STATS_PATH}`;
  const contentBase64 = Buffer.from(JSON.stringify(stats, null, 2)).toString('base64');
  const message = `chore(stats): update stats (visitors: ${stats.totalVisitors}, downloads: ${stats.totalDownloads}) [skip ci]`;

  async function attemptWrite(): Promise<{ success: boolean; message: string; status?: number }> {
    const getRes = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'MapDev-Hub',
      },
      cache: 'no-store',
    });

    let sha: string | undefined = undefined;
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
    }

    const putRes = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'MapDev-Hub',
      },
      body: JSON.stringify({
        message,
        content: contentBase64,
        sha,
        branch: 'main',
      }),
    });

    if (putRes.ok) {
      return { success: true, message: 'Stats synced' };
    }

    return { success: false, message: putRes.statusText, status: putRes.status };
  }

  try {
    const first = await attemptWrite();
    if (first.success) return first;
    if (first.status === 409) {
      await new Promise((r) => setTimeout(r, 400));
      return await attemptWrite();
    }
    return first;
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}
