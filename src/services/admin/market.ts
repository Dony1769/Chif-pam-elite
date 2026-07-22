import {
  adminCreateMarketPack,
  adminDeleteMarketPack,
  adminToggleMarketPackStatus,
} from '@/app/actions/adminActions';

export const AdminMarketService = {
  createPack: adminCreateMarketPack,
  deletePack: adminDeleteMarketPack,
  togglePackStatus: adminToggleMarketPackStatus,
};