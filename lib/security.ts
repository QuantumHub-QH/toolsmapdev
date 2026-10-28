import crypto from 'crypto';

function getAdminSecret(): string {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error('ADMIN_PASSWORD belum dikonfigurasi di server.');
  return secret;
}

// 1. Cryptographically Secure Session Generation & Verification
export function generateAdminSession(): string {
  const timestamp = Date.now().toString();
  const signature = crypto.createHmac('sha256', getAdminSecret()).update(timestamp).digest('hex');
  return Buffer.from(`${timestamp}.${signature}`).toString('base64');
}

export function verifyAdminSession(token?: string | null): boolean {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [timestampStr, signature] = decoded.split('.');
    if (!timestampStr || !signature) return false;

    // Session valid for up to 7 days
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp) || Date.now() - timestamp > 7 * 24 * 60 * 60 * 1000) {
      return false;
    }

    const expected = crypto.createHmac('sha256', getAdminSecret()).update(timestampStr).digest('hex');
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);

    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

// 2. Server-side Anti-Bruteforce Rate Limiter for Admin Login
const loginAttempts = new Map<string, { attempts: number; lockUntil: number }>();

export function checkLoginRateLimit(ip: string): { allowed: boolean; remainingLockSeconds?: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry) return { allowed: true };

  if (entry.lockUntil > now) {
    return {
      allowed: false,
      remainingLockSeconds: Math.ceil((entry.lockUntil - now) / 1000),
    };
  }

  // Lock expired, reset
  if (entry.lockUntil > 0 && entry.lockUntil <= now) {
    loginAttempts.delete(ip);
  }

  return { allowed: true };
}

export function recordFailedLogin(ip: string): { locked: boolean; attempts: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { attempts: 0, lockUntil: 0 };
  entry.attempts += 1;

  if (entry.attempts >= 5) {
    entry.lockUntil = now + 15 * 60 * 1000; // 15-minute lockout
    loginAttempts.set(ip, entry);
    return { locked: true, attempts: entry.attempts };
  }

  loginAttempts.set(ip, entry);
  return { locked: false, attempts: entry.attempts };
}

export function resetLoginAttempts(ip: string) {
  loginAttempts.delete(ip);
}
