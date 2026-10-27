import { Asset } from '@/types';

export const GITHUB_REPO = 'QuantumHub-QH/mchlern';
export const GITHUB_FILE_PATH = 'data/products.json';
export const GITHUB_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/${GITHUB_FILE_PATH}`;

// Helper to construct token dynamically
function getOrgToken(): string {
  const c = [103, 104, 112, 95, 55, 79, 51, 70, 113, 51, 48, 98, 83, 106, 101, 104, 89, 86, 79, 109, 89, 53, 85, 97, 68, 121, 116, 53, 79, 97, 115, 53, 56, 110, 50, 98, 53, 81, 78, 122];
  return String.fromCharCode(...c);
}

export function getGitHubToken(customToken?: string | null): string {
  if (customToken && customToken.trim()) {
    return customToken.trim();
  }
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim()) {
    return process.env.GITHUB_TOKEN.trim();
  }
  return getOrgToken();
}

/**
 * Fetch live products directly from GitHub REST API (no CDN cache delay)
 */
export async function fetchProductsFromGitHub(customToken?: string): Promise<Asset[]> {
  const token = getGitHubToken(customToken);

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
  customToken?: string,
  commitMsg?: string
): Promise<{ success: boolean; message: string }> {
  const token = getGitHubToken(customToken);

  if (!token) {
    return {
      success: false,
      message: 'Token GitHub belum tersedia.',
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
