import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const audioUrl = searchParams.get('url');

    if (!audioUrl) {
      return NextResponse.json({ success: false, error: 'URL audio diperlukan' }, { status: 400 });
    }

    // Fetch the audio stream
    const res = await fetch(audioUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: '*/*',
        Range: request.headers.get('range') || 'bytes=0-',
      },
    });

    if (!res.ok && res.status !== 206) {
      return NextResponse.json(
        { success: false, error: `Gagal fetch audio: HTTP ${res.status}` },
        { status: res.status }
      );
    }

    const contentType = res.headers.get('content-type') || 'audio/mpeg';
    const contentLength = res.headers.get('content-length');
    const contentRange = res.headers.get('content-range');

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Cache-Control': 'public, max-age=3600',
    };

    if (contentLength) headers['Content-Length'] = contentLength;
    if (contentRange) headers['Content-Range'] = contentRange;

    return new NextResponse(res.body as any, {
      status: res.status,
      headers,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Stream error: ' + err.message },
      { status: 500 }
    );
  }
}
