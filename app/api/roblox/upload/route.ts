import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const assetType = formData.get('assetType') as string; // 'Audio' or 'Decal'
    const displayName = (formData.get('displayName') as string) || (file ? file.name.replace(/\.[^/.]+$/, '') : 'Asset');
    const description = (formData.get('description') as string) || 'Uploaded via MapDev Hub Bulk Uploader';
    const apiKey = (formData.get('apiKey') as string)?.trim();
    const userId = (formData.get('userId') as string)?.trim();

    if (!file) {
      return NextResponse.json({ success: false, error: 'File tidak ditemukan' }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Roblox API Key diperlukan' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Roblox User ID diperlukan' }, { status: 400 });
    }

    // Build Open Cloud request payload
    const robloxMetadata = {
      assetType: assetType === 'Audio' ? 'Audio' : 'Decal',
      displayName: displayName.slice(0, 50),
      description: description.slice(0, 1000),
      creationContext: {
        creator: {
          userId: userId,
        },
      },
    };

    const robloxFormData = new FormData();
    robloxFormData.append('request', JSON.stringify(robloxMetadata));
    robloxFormData.append('fileContent', file, file.name);

    const robloxRes = await fetch('https://apis.roblox.com/assets/v1/assets', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
      },
      body: robloxFormData,
    });

    const responseText = await robloxRes.text();
    let responseJson: any = null;
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      // not JSON
    }

    if (!robloxRes.ok) {
      const errorMsg = responseJson?.message || responseJson?.error || responseText || `Roblox API error: ${robloxRes.status}`;
      return NextResponse.json({
        success: false,
        error: errorMsg,
        status: robloxRes.status,
      }, { status: robloxRes.status >= 500 ? 502 : 400 });
    }

    // Extract assetId or operation path
    const assetId = responseJson?.response?.assetId || responseJson?.assetId || responseJson?.path?.split('/')?.pop();

    return NextResponse.json({
      success: true,
      assetId: assetId || 'Pending',
      data: responseJson,
      fileName: file.name,
      displayName: displayName,
      assetType: assetType,
    });
  } catch (err: any) {
    console.error('Roblox upload handler error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Gagal memproses upload ke Roblox',
    }, { status: 500 });
  }
}
