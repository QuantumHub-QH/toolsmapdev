import { NextRequest, NextResponse } from 'next/server';
import { getDiscordSession } from '@/lib/discord-session';
import { getPremiumEntitlement } from '@/lib/premium';
import {
  DailyUploadLimitError,
  releaseDailyUpload,
  reserveDailyUploads,
} from '@/lib/upload-limits';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const session = getDiscordSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Login Discord diperlukan untuk upload.' }, { status: 401 });
  }

  let reservedDate: string | null = null;
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const assetType = formData.get('assetType');
    const displayName = formData.get('displayName');
    const description = formData.get('description');
    const apiKey = formData.get('apiKey');
    const userId = formData.get('userId');

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'File tidak ditemukan.' }, { status: 400 });
    }
    if (assetType !== 'Audio' && assetType !== 'Decal') {
      return NextResponse.json({ success: false, error: 'Jenis asset tidak valid.' }, { status: 400 });
    }
    if (typeof apiKey !== 'string' || !apiKey.trim()) {
      return NextResponse.json({ success: false, error: 'Roblox API Key diperlukan.' }, { status: 400 });
    }
    if (typeof userId !== 'string' || !/^\d+$/.test(userId.trim())) {
      return NextResponse.json({ success: false, error: 'Roblox User ID tidak valid.' }, { status: 400 });
    }

    const entitlement = await getPremiumEntitlement(session.id);
    if (!entitlement.isPremium) {
      const reservation = await reserveDailyUploads(session.id);
      reservedDate = reservation.date;
    }

    const robloxMetadata = {
      assetType,
      displayName: (typeof displayName === 'string' && displayName.trim() ? displayName : file.name.replace(/\.[^/.]+$/, '')).slice(0, 50),
      description: (typeof description === 'string' ? description : 'Uploaded via MapDev Hub Bulk Uploader').slice(0, 1000),
      creationContext: {
        creator: { userId: userId.trim() },
      },
    };

    const robloxFormData = new FormData();
    robloxFormData.append('request', JSON.stringify(robloxMetadata));
    robloxFormData.append('fileContent', file, file.name);

    const robloxResponse = await fetch('https://apis.roblox.com/assets/v1/assets', {
      method: 'POST',
      headers: { 'x-api-key': apiKey.trim() },
      body: robloxFormData,
    });

    const responseText = await robloxResponse.text();
    let responseJson: Record<string, unknown> | null = null;
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = null;
    }

    if (!robloxResponse.ok) {
      await releaseReservation(session.id, reservedDate);
      reservedDate = null;
      const errorData = responseJson as { message?: string; error?: string } | null;
      const errorMessage = errorData?.message || errorData?.error || responseText || `Roblox API error: ${robloxResponse.status}`;
      return NextResponse.json({
        success: false,
        error: errorMessage,
        status: robloxResponse.status,
      }, { status: robloxResponse.status >= 500 ? 502 : 400 });
    }

    const responseData = responseJson as {
      response?: { assetId?: string };
      assetId?: string;
      path?: string;
    } | null;
    const assetId = responseData?.response?.assetId || responseData?.assetId || responseData?.path?.split('/').pop();

    return NextResponse.json({
      success: true,
      assetId: assetId || 'Pending',
      data: responseJson,
      fileName: file.name,
      displayName: robloxMetadata.displayName,
      assetType,
      unlimited: entitlement.isPremium,
    });
  } catch (error) {
    await releaseReservation(session.id, reservedDate);
    if (error instanceof DailyUploadLimitError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 429 });
    }

    console.error('Roblox upload handler error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Gagal memproses upload ke Roblox.',
    }, { status: 503 });
  }
}

async function releaseReservation(discordId: string, date: string | null): Promise<void> {
  if (!date) return;
  try {
    await releaseDailyUpload(discordId, date);
  } catch (error) {
    console.error('Failed to release upload quota reservation:', error);
  }
}
