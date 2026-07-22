export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function validatePassword(value: string): { ok: boolean; message?: string } {
  if (!value || value.trim().length < 6) {
    return { ok: false, message: 'Le mot de passe doit contenir au moins 6 caractères.' };
  }
  return { ok: true };
}

export function validateBalance(value: number): { ok: boolean; message?: string } {
  if (!Number.isFinite(value)) {
    return { ok: false, message: 'Le montant saisi est invalide.' };
  }
  if (value < 0) {
    return { ok: false, message: 'Le solde ne peut pas être négatif.' };
  }
  if (value > 1_000_000_000) {
    return { ok: false, message: 'Le solde dépasse la limite autorisée.' };
  }
  return { ok: true };
}

export function sanitizeAdminNote(value: string): string {
  return value.trim().slice(0, 500);
}

export function sanitizeBanReason(value: string | null): string | null {
  if (value == null) return null;
  const next = value.trim().slice(0, 300);
  return next.length > 0 ? next : null;
}

export function validateRequiredText(
  value: string,
  label: string,
  maxLength = 120
): { ok: boolean; message?: string } {
  const normalized = value.trim();
  if (!normalized) {
    return { ok: false, message: `${label} est requis.` };
  }
  if (normalized.length > maxLength) {
    return { ok: false, message: `${label} dépasse la longueur autorisée.` };
  }
  return { ok: true };
}

export function validatePositiveAmount(
  value: number,
  label: string,
  max = 1_000_000_000
): { ok: boolean; message?: string } {
  if (!Number.isFinite(value)) {
    return { ok: false, message: `${label} est invalide.` };
  }
  if (value <= 0) {
    return { ok: false, message: `${label} doit être supérieur à zéro.` };
  }
  if (value > max) {
    return { ok: false, message: `${label} dépasse la limite autorisée.` };
  }
  return { ok: true };
}

export function validateIntegerInRange(
  value: number,
  label: string,
  min: number,
  max: number
): { ok: boolean; message?: string } {
  if (!Number.isInteger(value)) {
    return { ok: false, message: `${label} doit être un entier.` };
  }
  if (value < min || value > max) {
    return { ok: false, message: `${label} doit être entre ${min} et ${max}.` };
  }
  return { ok: true };
}

export function sanitizeCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

export function validatePhoneNumber(value: string): { ok: boolean; message?: string } {
  const normalized = value.replace(/\s+/g, '').trim();
  if (!normalized) {
    return { ok: false, message: 'Le numéro est requis.' };
  }
  if (!/^\+?\d{8,15}$/.test(normalized)) {
    return { ok: false, message: 'Le numéro de téléphone est invalide.' };
  }
  return { ok: true };
}