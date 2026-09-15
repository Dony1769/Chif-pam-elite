export class PhoneNormalizationError extends Error {
  constructor() {
    super('Numéro de téléphone invalide. Utilisez 8 chiffres haïtiens ou +509XXXXXXXX.');
    this.name = 'PhoneNormalizationError';
  }
}

export function normalizePhoneNumber(value: string): string {
  const raw = String(value ?? '').trim();
  const hasInternationalPrefix = raw.startsWith('+') || raw.startsWith('00');
  let digits = raw.replace(/\D/g, '');

  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 8) return `+509${digits}`;
  if (digits.length === 11 && digits.startsWith('509')) return `+${digits}`;
  if (hasInternationalPrefix && digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  throw new PhoneNormalizationError();
}

export function phoneDigits(value: string): string {
  return normalizePhoneNumber(value).slice(1);
}

/** @deprecated Use normalizePhoneNumber on the server. */
export function normalizePhoneInput(value: string): string {
  return normalizePhoneNumber(value);
}