import { NextResponse } from 'next/server';
import { ASSETS_DATA, LIGHTING_PRESETS, CODE_SNIPPETS } from '@/lib/data';

export async function GET() {
  const totalDownloads = ASSETS_DATA.reduce((acc, curr) => acc + curr.stats.downloads, 0);
  const totalFavorites = ASSETS_DATA.reduce((acc, curr) => acc + curr.stats.favorites, 0);
  const totalViews = ASSETS_DATA.reduce((acc, curr) => acc + curr.stats.views, 0);

  return NextResponse.json({
    success: true,
    data: {
      assetsCount: ASSETS_DATA.length,
      presetsCount: LIGHTING_PRESETS.length,
      snippetsCount: CODE_SNIPPETS.length,
      totalDownloads,
      totalFavorites,
      totalViews,
      verifiedCreators: 8,
      status: 'operational',
      apiVersion: '1.0.0',
    },
  });
}
