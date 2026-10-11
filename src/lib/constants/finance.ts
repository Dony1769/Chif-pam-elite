export const FINANCE_PAYMENT_METHODS = ['MonCash', 'NatCash'] as const;

export type FinancePaymentMethod = (typeof FINANCE_PAYMENT_METHODS)[number];
