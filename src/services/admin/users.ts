import {
  adminResetPassword,
  adminSetUserBalance,
  adminSetUserBanStatus,
} from '@/app/actions/adminActions';

export const AdminUsersService = {
  resetPassword: adminResetPassword,
  setBanStatus: adminSetUserBanStatus,
  setBalance: adminSetUserBalance,
};