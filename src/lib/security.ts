import { createHmac, timingSafeEqual } from 'crypto';

const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F]/g;

export function sanitizePlainText(input: string, maxLength = 1000): string {
  return input
    .replace(CONTROL_CHARS_REGEX, ' ')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

export function isSafeInternalPath(path: string): boolean {
  if (!path.startsWith('/')) return false;
  if (path.startsWith('//')) return false;
  return /^\/[a-zA-Z0-9/_?=&.-]*$/.test(path);
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';

  if (!origin || !host) return false;

  try {
    const originUrl = new URL(origin);
    const expectedOrigin = `${proto}://${host}`;
    return originUrl.origin === expectedOrigin;
  } catch {
    return false;
  }
}

export function signValue(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function verifySignedValue(value: string, signature: string, secret: string): boolean {
  const expected = signValue(value, secret);

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, signatureBuffer);
}
