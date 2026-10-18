import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const BLASTSHIELD_SESSION_COOKIE = 'blastshield_session';

function digest(value: string) {
  return createHash('sha256').update(value).digest();
}

function sessionSecret() {
  return process.env.BLASTSHIELD_SESSION_SECRET || process.env.INCIDENT_COMMANDER_PASSKEY || 'development-only-session-secret';
}

export function createSessionToken() {
  const expiresAt = Date.now() + 60 * 60 * 1000;
  const payload = `${expiresAt}.${randomBytes(16).toString('hex')}`;
  const signature = createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function isValidSessionToken(token: string) {
  const [expiresAtText, nonce, signature] = token.split('.');
  if (!expiresAtText || !nonce || !signature) return false;
  const payload = `${expiresAtText}.${nonce}`;
  const expected = createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  if (signature.length !== expected.length) return false;
  return Number(expiresAtText) > Date.now() && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function isValidPasskey(value: string) {
  const configured = process.env.INCIDENT_COMMANDER_PASSKEY;
  if (!configured || !value) return false;
  const expected = digest(configured);
  const received = digest(value);
  return timingSafeEqual(expected, received);
}

export function hasClearance(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  const token = cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${BLASTSHIELD_SESSION_COOKIE}=`))
    ?.split('=')[1];

  return Boolean(token && isValidSessionToken(token));
}

export function unauthorized() {
  return Response.json(
    { success: false, error: 'Incident Commander clearance required.' },
    { status: 401 }
  );
}
