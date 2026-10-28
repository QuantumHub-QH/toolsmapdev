import { NextRequest, NextResponse } from 'next/server';
import { getDiscordSession } from '@/lib/discord-session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const OPERATION_ID_PATTERN = /^operations\/[A-Za-z0-9_-]+$/;

export async function POST(request: NextRequest) {
  const session = getDiscordSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Login Discord diperlukan untuk memeriksa upload.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'Request body tidak valid.' }, { status: 400 });
    }

    const operationId = typeof body.operationId === 'string' ? body.operationId : '';
    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';

    if (!OPERATION_ID_PATTERN.test(operationId)) {
      return NextResponse.json({ success: false, error: 'Operation ID Roblox tidak valid.' }, { status: 400 });
    }
    if (!apiKey || apiKey.length > 256) {
      return NextResponse.json({ success: false, error: 'Roblox API Key tidak valid.' }, { status: 400 });
    }

    const response = await fetch(`https://apis.roblox.com/assets/v1/${operationId}`, {
      headers: { 'x-api-key': apiKey },
      cache: 'no-store',
    });
    const responseText = await response.text();
    let result: {
      done?: boolean;
      response?: { assetId?: string; moderationResult?: { moderationState?: string } };
      error?: { message?: string; code?: string };
    };

    try {
      result = JSON.parse(responseText);
    } catch {
      console.error('Roblox operation status returned non-JSON:', response.status, responseText.slice(0, 300));
      return NextResponse.json(
        { success: false, error: `Roblox mengembalikan respons tidak valid (HTTP ${response.status}).` },
        { status: 502 }
      );
    }

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: result.error?.message || `Gagal memeriksa status Roblox (HTTP ${response.status}).`,
      }, { status: response.status >= 500 ? 502 : 400 });
    }

    if (!result.done) {
      return NextResponse.json({ success: true, done: false }, {
        headers: { 'Cache-Control': 'private, no-store' },
      });
    }

    if (result.error) {
      return NextResponse.json({
        success: false,
        done: true,
        error: result.error.message || result.error.code || 'Roblox gagal memproses asset.',
      }, { status: 422 });
    }

    const assetId = result.response?.assetId;
    if (!assetId) {
      return NextResponse.json({
        success: false,
        done: true,
        error: 'Roblox menyelesaikan operasi tanpa mengembalikan Asset ID.',
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      done: true,
      assetId,
      moderationState: result.response?.moderationResult?.moderationState,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Roblox operation status check failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Gagal memeriksa status upload Roblox.',
    }, { status: 503 });
  }
}
