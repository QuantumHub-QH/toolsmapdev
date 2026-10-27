import { NextRequest, NextResponse } from 'next/server';
import { Ytdl } from '@distube/ytdl-core';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawUrl = (body.url || '').trim();

    if (!rawUrl) {
      return NextResponse.json(
        { success: false, error: 'URL video/audio tidak boleh kosong' },
        { status: 400 }
      );
    }

    // 1. Check TikTok URL
    if (rawUrl.includes('tiktok.com')) {
      try {
        const tikRes = await fetch(`https://tikwm.com/api/?url=${encodeURIComponent(rawUrl)}`, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          cache: 'no-store',
        });

        const tikData = await tikRes.json();
        if (tikData.code === 0 && tikData.data) {
          const d = tikData.data;
          let musicUrl = d.music || '';
          if (musicUrl && !musicUrl.startsWith('http')) {
            musicUrl = 'https://tikwm.com' + musicUrl;
          }

          if (!musicUrl) {
            return NextResponse.json(
              { success: false, error: 'Audio tidak ditemukan pada video TikTok ini' },
              { status: 404 }
            );
          }

          return NextResponse.json({
            success: true,
            platform: 'tiktok',
            title: d.title || 'TikTok Audio Track',
            author: d.author?.nickname || d.author?.unique_id || 'TikTok User',
            thumbnail: d.cover || d.origin_cover || '',
            duration: d.duration || 0,
            audioUrl: musicUrl,
            proxyAudioUrl: `/api/media/stream?url=${encodeURIComponent(musicUrl)}`,
          });
        } else {
          return NextResponse.json(
            { success: false, error: tikData.msg || 'Gagal mengambil audio dari link TikTok tersebut' },
            { status: 400 }
          );
        }
      } catch (tikErr: any) {
        return NextResponse.json(
          { success: false, error: 'Error mengambil data TikTok: ' + tikErr.message },
          { status: 500 }
        );
      }
    }

    // 2. Check YouTube or YouTube Music
    if (
      rawUrl.includes('youtube.com') ||
      rawUrl.includes('youtu.be') ||
      rawUrl.includes('music.youtube.com')
    ) {
      try {
        const yt = new Ytdl();
        const info = await yt.getInfo(rawUrl);

        // Find best audio format
        const audioFormat =
          info.formats.find((f) => f.hasAudio && !f.hasVideo && f.url) ||
          info.formats.find((f) => f.hasAudio && f.url);

        if (!audioFormat || !audioFormat.url) {
          return NextResponse.json(
            { success: false, error: 'Stream audio tidak ditemukan untuk video YouTube ini' },
            { status: 404 }
          );
        }

        const thumbs = info.videoDetails.thumbnails || [];
        const bestThumb =
          thumbs[thumbs.length - 1]?.url ||
          `https://i.ytimg.com/vi/${info.videoDetails.id}/hqdefault.jpg`;

        const duration = info.videoDetails.lengthSeconds || 0;
        const platform = rawUrl.includes('music.youtube.com') ? 'youtube_music' : 'youtube';

        return NextResponse.json({
          success: true,
          platform,
          title: info.videoDetails.title || 'YouTube Audio',
          author: info.videoDetails.author?.name || 'YouTube Creator',
          thumbnail: bestThumb,
          duration,
          audioUrl: audioFormat.url,
          proxyAudioUrl: `/api/media/stream?url=${encodeURIComponent(audioFormat.url)}`,
        });
      } catch (ytErr: any) {
        return NextResponse.json(
          { success: false, error: 'Error memproses YouTube: ' + ytErr.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error:
          'Format URL tidak didukung. Masukkan link YouTube, YouTube Music, atau TikTok yang valid.',
      },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Server error: ' + err.message },
      { status: 500 }
    );
  }
}
