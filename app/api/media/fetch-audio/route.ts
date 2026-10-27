import { NextRequest, NextResponse } from 'next/server';
import { Ytdl, Client } from '@distube/ytdl-core';

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/)|music\.youtube\.com\/watch\?v=)([\w-]{11})/i
  );
  return match ? match[1] : null;
}

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
    const ytVideoId = extractYouTubeId(rawUrl);
    if (
      ytVideoId ||
      rawUrl.includes('youtube.com') ||
      rawUrl.includes('youtu.be') ||
      rawUrl.includes('music.youtube.com')
    ) {
      const cleanUrl = ytVideoId
        ? `https://www.youtube.com/watch?v=${ytVideoId}`
        : rawUrl;

      // Method A: Ytdl with VisionOS client (Needs no player script decipher, works on Vercel AWS Lambda)
      try {
        const yt = new Ytdl({
          clients: [Client.VisionOS, Client.Tv, Client.WebEmbedded],
        });
        const info = await yt.getInfo(cleanUrl);

        // Find best audio format
        const audioFormat =
          info.formats.find((f) => f.hasAudio && !f.hasVideo && f.url) ||
          info.formats.find((f) => f.hasAudio && f.url);

        if (audioFormat && audioFormat.url) {
          const thumbs = info.videoDetails.thumbnails || [];
          const bestThumb =
            thumbs[thumbs.length - 1]?.url ||
            `https://i.ytimg.com/vi/${info.videoDetails.id || ytVideoId}/hqdefault.jpg`;

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
        }
      } catch (ytdlErr: any) {
        console.warn('VisionOS Ytdl failed, attempting fallback...', ytdlErr?.message);
      }

      // Method B: Fallback to YouTube oEmbed + Invidious instance
      if (ytVideoId) {
        try {
          const oembedRes = await fetch(
            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytVideoId}&format=json`
          );
          if (oembedRes.ok) {
            const oembed = await oembedRes.json();
            // Try invidious public audio stream
            const invidiousRes = await fetch(
              `https://invidious.nerdvpn.de/api/v1/videos/${ytVideoId}`,
              { cache: 'no-store' }
            );
            if (invidiousRes.ok) {
              const invData = await invidiousRes.json();
              const invFormat = (invData.adaptiveFormats || []).find(
                (f: any) => f.type && f.type.startsWith('audio') && f.url
              );
              if (invFormat && invFormat.url) {
                return NextResponse.json({
                  success: true,
                  platform: rawUrl.includes('music.youtube.com') ? 'youtube_music' : 'youtube',
                  title: oembed.title || invData.title,
                  author: oembed.author_name || invData.author,
                  thumbnail: `https://i.ytimg.com/vi/${ytVideoId}/hqdefault.jpg`,
                  duration: invData.lengthSeconds || 0,
                  audioUrl: invFormat.url,
                  proxyAudioUrl: `/api/media/stream?url=${encodeURIComponent(invFormat.url)}`,
                });
              }
            }
          }
        } catch (fbErr: any) {
          console.warn('Fallback stream failed:', fbErr);
        }
      }

      return NextResponse.json(
        {
          success: false,
          error:
            'Gagal mengekstrak audio dari link YouTube ini. Pastikan video tidak di-private atau berumur 18+.',
        },
        { status: 500 }
      );
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
