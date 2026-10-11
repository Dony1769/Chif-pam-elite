import {
  adminCloseChallenge,
  adminCreateChallenge,
  adminDeleteChallenge,
} from '@/app/actions/adminActions';
import { type ChallengeCreateInput } from '@/validators/challenges';

export const AdminChallengesService = {
  create(input: ChallengeCreateInput) {
    return adminCreateChallenge(input);
  },

  close(challengeId: string) {
    return adminCloseChallenge(challengeId);
  },

  delete(challengeId: string) {
    return adminDeleteChallenge(challengeId);
  },
};
