import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId')?.trim();

  if (!userId) {
    return NextResponse.json({ success: false, error: 'User ID Roblox diperlukan' }, { status: 400 });
  }

  try {
    // 1. Fetch user profile from Roblox API
    const userRes = await fetch(`https://users.roblox.com/v1/users/${userId}`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 },
    });

    if (!userRes.ok) {
      return NextResponse.json({ 
        success: false, 
        error: `User Roblox dengan ID ${userId} tidak ditemukan. Pastikan User ID benar.` 
      }, { status: 404 });
    }

    const userData = await userRes.json();

    // 2. Fetch avatar headshot thumbnail
    let avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${userData.name}`;
    try {
      const thumbRes = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=true`,
        { headers: { 'Accept': 'application/json' }, next: { revalidate: 3600 } }
      );
      if (thumbRes.ok) {
        const thumbData = await thumbRes.json();
        if (thumbData.data && thumbData.data[0]?.imageUrl) {
          avatarUrl = thumbData.data[0].imageUrl;
        }
      }
    } catch (e) {
      // fallback to generated avatar
    }

    return NextResponse.json({
      success: true,
      user: {
        id: String(userData.id),
        name: userData.name,
        displayName: userData.displayName || userData.name,
        avatarUrl,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Gagal menghubungi server Roblox' }, { status: 500 });
  }
}
