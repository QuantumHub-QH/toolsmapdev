import fs from 'fs';
import path from 'path';
import { fetchStatsFromGitHub, commitStatsToGitHub, GlobalStats } from '@/lib/github';

const STATS_FILE_PATH = path.join(process.cwd(), 'data', 'stats.json');

// In-memory cache for super fast response (< 10ms)
let cachedStats: GlobalStats | null = null;
let lastSyncTime = 0;

export async function getLiveStats(): Promise<GlobalStats> {
  // Return memory cache if fresh (< 10 seconds)
  if (cachedStats && Date.now() - lastSyncTime < 10000) {
    return cachedStats;
  }

  // GitHub is the canonical store in production; the bundled file may be stale.
  if (process.env.GITHUB_TOKEN?.trim()) {
    const ghStats = await fetchStatsFromGitHub();
    cachedStats = ghStats;
    lastSyncTime = Date.now();
    return ghStats;
  }

  // Use the bundled file when GitHub is not configured.
  try {
    if (fs.existsSync(STATS_FILE_PATH)) {
      const content = fs.readFileSync(STATS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed.totalVisitors === 'number') {
        cachedStats = parsed;
        lastSyncTime = Date.now();
        return parsed;
      }
    }
  } catch (e) {}

  // Try GitHub when no token is configured (for public repositories).
  try {
    const ghStats = await fetchStatsFromGitHub();
    if (ghStats && typeof ghStats.totalVisitors === 'number') {
      cachedStats = ghStats;
      lastSyncTime = Date.now();
      return ghStats;
    }
  } catch (e) {}

  return {
    totalVisitors: 0,
    totalDownloads: 0,
    downloads: {},
    updatedAt: new Date().toISOString(),
  };
}

export function writeLocalStats(stats: GlobalStats) {
  try {
    const dir = path.dirname(STATS_FILE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATS_FILE_PATH, JSON.stringify(stats, null, 2), 'utf-8');
    cachedStats = stats;
    lastSyncTime = Date.now();
  } catch (e) {}
}

export async function recordVisitor(isNewVisitor: boolean): Promise<GlobalStats> {
  const current = await getLiveStats();
  const newVisitors = isNewVisitor ? current.totalVisitors + 1 : current.totalVisitors;

  const updated: GlobalStats = {
    ...current,
    totalVisitors: newVisitors,
    updatedAt: new Date().toISOString(),
  };

  writeLocalStats(updated);

  if (isNewVisitor) {
    commitStatsToGitHub(updated).catch((err) => {
      console.warn('Background stats commit warning:', err);
    });
  }

  return updated;
}
