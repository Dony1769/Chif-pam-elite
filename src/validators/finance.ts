import { FINANCE_PAYMENT_METHODS, type FinancePaymentMethod } from '@/lib/constants/finance';
import { normalizePhoneNumber } from '@/lib/phone';
import { validatePhoneNumber, validatePositiveAmount } from '@/lib/validation';

export type FinanceDepositInput = {
  amount: number;
  method: string;
  proofUrl: string;
};

export type FinanceWithdrawalInput = {
  amount: number;
  method: string;
  phone: string;
};

export function validateDepositInput(input: FinanceDepositInput): { ok: true; method: FinancePaymentMethod } | { ok: false; message: string } {
  const amountCheck = validatePositiveAmount(input.amount, 'Le montant');
  if (!amountCheck.ok) {
    return { ok: false, message: amountCheck.message || 'Montant invalide.' };
  }

  if (!FINANCE_PAYMENT_METHODS.includes(input.method as FinancePaymentMethod)) {
    return { ok: false, message: 'Méthode de paiement invalide.' };
  }

  if (!input.proofUrl.trim()) {
    return { ok: false, message: 'Preuve de paiement manquante.' };
  }

  return { ok: true, method: input.method as FinancePaymentMethod };
}

export function validateWithdrawalInput(input: FinanceWithdrawalInput): { ok: true; method: FinancePaymentMethod; phone: string } | { ok: false; message: string } {
  const amountCheck = validatePositiveAmount(input.amount, 'Le montant');
  if (!amountCheck.ok) {
    return { ok: false, message: amountCheck.message || 'Montant invalide.' };
  }

  if (!FINANCE_PAYMENT_METHODS.includes(input.method as FinancePaymentMethod)) {
    return { ok: false, message: 'Méthode de paiement invalide.' };
  }

  const phoneCheck = validatePhoneNumber(input.phone);
  if (!phoneCheck.ok) {
    return { ok: false, message: phoneCheck.message || 'Numéro invalide.' };
  }

  return { ok: true, method: input.method as FinancePaymentMethod, phone: normalizePhoneNumber(input.phone) };
}
