import { submitDepositTransaction, submitWithdrawalTransaction } from '@/app/actions/clientFinanceActions';

export const ClientFinanceService = {
  submitDeposit(amount: number, method: string, proofUrl: string) {
    return submitDepositTransaction(amount, method, proofUrl);
  },

  submitWithdrawal(amount: number, method: string, phoneNumber: string) {
    return submitWithdrawalTransaction(amount, method, phoneNumber);
  },
};
