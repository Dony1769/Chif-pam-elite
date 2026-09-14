export class PhoneNormalizationError extends Error {
  constructor() {
    super('Numéro de téléphone invalide. Utilisez 8 chiffres haïtiens ou +509XXXXXXXX.');
    this.name = 'PhoneNormalizationError';
  }
}

export function normalizePhoneNumber(value: string): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 8) return `+509${digits}`;
  if (digits.length === 11 && digits.startsWith('509')) return `+${digits}`;
  if (String(value ?? '').trim().startsWith('+') && digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  throw new PhoneNormalizationError();
}

export function phoneDigits(value: string): string {
  return normalizePhoneNumber(value).slice(1);
}

/** @deprecated Use normalizePhoneNumber on the server. */
export function normalizePhoneInput(value: string): string {
  return normalizePhoneNumber(value);
}