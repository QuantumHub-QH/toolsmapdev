import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://solusimapbymells.vercel.app';

  if (error || !code) {
    // User denied authorization or error
    return NextResponse.redirect(`${baseUrl}/?discord_error=denied`);
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(`${baseUrl}/?discord_error=config`);
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      console.error('Token exchange failed:', await tokenRes.text());
      return NextResponse.redirect(`${baseUrl}/?discord_error=token`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch user info from Discord API
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      console.error('User fetch failed:', await userRes.text());
      return NextResponse.redirect(`${baseUrl}/?discord_error=user`);
    }

    const discordUser = await userRes.json();

    // 3. Build user object
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.discriminator || '0') % 5}.png`;

    const user = {
      id: discordUser.id,
      username: discordUser.username,
      discriminator: discordUser.discriminator || '0',
      avatarUrl,
      isAuthorized: true,
      joinedAt: new Date().toISOString(),
    };

    // 4. Redirect back to homepage with user data encoded in URL params
    const userData = encodeURIComponent(JSON.stringify(user));
    return NextResponse.redirect(`${baseUrl}/?discord_user=${userData}`);

  } catch (err) {
    console.error('Discord OAuth error:', err);
    return NextResponse.redirect(`${baseUrl}/?discord_error=server`);
  }
}
