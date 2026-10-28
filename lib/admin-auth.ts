import { NextRequest } from 'next/server';
import { verifyAdminSession } from '@/lib/security';

export function isAuthorizedAdmin(request: NextRequest): boolean {
  const cookieToken = request.cookies.get('admin_panel_auth')?.value;
  if (cookieToken && verifyAdminSession(cookieToken)) return true;

  const authorization = request.headers.get('authorization');
  if (authorization?.startsWith('Bearer ') && verifyAdminSession(authorization.slice(7).trim())) {
    return true;
  }

  const adminKey = request.headers.get('x-admin-key');
  return Boolean(adminKey && process.env.ADMIN_PASSWORD && adminKey === process.env.ADMIN_PASSWORD);
}
