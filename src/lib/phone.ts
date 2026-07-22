export function normalizePhoneInput(value: string): string {
  return value.trim().replace(/\s/g, '');
}