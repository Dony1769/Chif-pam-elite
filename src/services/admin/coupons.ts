import { adminCreateCoupon, adminToggleCouponStatus } from '@/app/actions/adminActions';

export const AdminCouponsService = {
  create: adminCreateCoupon,
  toggleStatus: adminToggleCouponStatus,
};