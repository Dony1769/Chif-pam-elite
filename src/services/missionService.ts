import { supabase } from '@/lib/supabase';

export type RewardType = 'cp' | 'diamonds' | 'xp';

export type MissionItem = {
  id: string;
  title: string;
  description: string;
  reward_type: RewardType;
  reward_amount: number;
  progress: number;
  target_count: number;
  is_claimed: boolean;
};

export const fetchDailyMissions = async (userId: string): Promise<MissionItem[]> => {
  const missionResponse = await supabase.rpc('get_or_create_daily_missions', { p_user_id: userId });
  if (missionResponse.error) throw missionResponse.error;
  return (missionResponse.data as MissionItem[] | null) ?? [];
};

export const canClaimMission = (mission: MissionItem): boolean => {
  return !mission.is_claimed && mission.progress >= mission.target_count;
};

export const formatMissionProgress = (mission: MissionItem): string => {
  if (mission.is_claimed) return 'Réclamé';
  return mission.progress >= mission.target_count
    ? 'Prêt à réclamer'
    : `Progression ${mission.progress}/${mission.target_count}`;
};
