import { NextRequest } from 'next/server';
import { verifyAdminSession } from '@/lib/security';

export function isAuthorizedAdmin(request: NextRequest): boolean {
  const cookieToken = request.cookies.get('admin_panel_auth')?.value;
  if (cookieToken && verifyAdminSession(cookieToken)) return true;

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer && verifyAdminSession(bearer)) return true;
  }

  const adminKey = request.headers.get('x-admin-key');
  return Boolean(adminKey && process.env.ADMIN_PASSWORD && adminKey === process.env.ADMIN_PASSWORD);
}
