BEGIN;

CREATE OR REPLACE FUNCTION public.add_xp_with_multiplier(p_user_id uuid, xp_amount integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_level integer;
  v_multiplier numeric;
  v_added_xp bigint;
  v_new_xp bigint;
  v_new_level integer;
  v_diamonds_rewarded bigint := 0;
  v_old_level integer;
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF xp_amount IS NULL OR xp_amount <= 0 THEN
    RETURN jsonb_build_object('added_xp', 0, 'leveled_up', false, 'message', 'xp_amount invalide');
  END IF;

  SELECT prof.level, coalesce(lp.xp_multiplier, 1.0)
    INTO v_level, v_multiplier
  FROM public.profiles prof
  LEFT JOIN public.level_perks lp ON lp.level = prof.level
  WHERE prof.id = p_user_id
  FOR UPDATE;

  IF v_level IS NULL THEN
    RETURN jsonb_build_object('added_xp', 0, 'leveled_up', false, 'message', 'Profil introuvable');
  END IF;

  v_old_level := greatest(1, v_level);
  v_added_xp := floor(xp_amount::numeric * v_multiplier)::bigint;
  UPDATE public.profiles SET xp = coalesce(xp, 0) + v_added_xp WHERE id = p_user_id;
  SELECT xp INTO v_new_xp FROM public.profiles WHERE id = p_user_id;
  v_new_level := greatest(1, floor(sqrt(v_new_xp::numeric / 1000))::integer + 1);

  IF v_new_level > v_old_level THEN
    v_diamonds_rewarded := 50 * ((v_new_level * (v_new_level + 1) / 2) - (v_old_level * (v_old_level + 1) / 2));
    UPDATE public.profiles SET level = v_new_level, diamonds = coalesce(diamonds, 0) + v_diamonds_rewarded WHERE id = p_user_id;
  ELSE
    UPDATE public.profiles SET level = v_new_level WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'xp_added', v_added_xp,
    'xp_total', v_new_xp,
    'old_level', v_old_level,
    'new_level', v_new_level,
    'level_up', v_new_level > v_old_level,
    'leveled_up', v_new_level > v_old_level,
    'diamonds_rewarded', v_diamonds_rewarded,
    'next_level_xp', v_new_level * v_new_level * 1000
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_calendar_reward(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := current_date;
  v_day_num integer := extract(day FROM current_date)::integer;
  v_reward record;
  v_profile public.profiles;
  v_old_level integer;
  v_new_level integer;
  v_new_xp bigint;
  v_diamonds_rewarded bigint := 0;
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_calendar_claims WHERE user_id = p_user_id AND claim_date = v_today) THEN
    RETURN json_build_object('success', false, 'message', 'Déjà réclamé pour le ' || v_day_num);
  END IF;

  SELECT * INTO v_reward FROM public.daily_rewards_config WHERE day_number = v_day_num;
  IF NOT FOUND THEN
    v_reward := row(v_day_num, 'cp', 10, false);
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Profil introuvable');
  END IF;

  v_old_level := greatest(1, coalesce(v_profile.level, 1));
  UPDATE public.profiles
  SET jetons_cp = coalesce(jetons_cp, 0) + CASE WHEN v_reward.reward_type = 'cp' THEN v_reward.amount ELSE 0 END,
      diamonds = coalesce(diamonds, 0) + CASE WHEN v_reward.reward_type = 'diamonds' THEN v_reward.amount ELSE 0 END,
      xp = coalesce(xp, 0) + CASE WHEN v_reward.reward_type = 'xp' THEN v_reward.amount ELSE 0 END
  WHERE id = p_user_id
  RETURNING * INTO v_profile;

  v_new_xp := coalesce(v_profile.xp, 0);
  v_new_level := greatest(1, floor(sqrt(v_new_xp::numeric / 1000))::integer + 1);
  IF v_new_level > v_old_level THEN
    v_diamonds_rewarded := 50 * ((v_new_level * (v_new_level + 1) / 2) - (v_old_level * (v_old_level + 1) / 2));
    UPDATE public.profiles SET level = v_new_level, diamonds = coalesce(diamonds, 0) + v_diamonds_rewarded WHERE id = p_user_id RETURNING * INTO v_profile;
  END IF;

  INSERT INTO public.user_calendar_claims (user_id, claim_date, day_number, reward_amount, reward_type)
  VALUES (p_user_id, v_today, v_day_num, v_reward.amount, v_reward.reward_type);

  RETURN json_build_object(
    'success', true,
    'day_number', v_day_num,
    'new_cp', v_profile.jetons_cp,
    'new_diamonds', v_profile.diamonds,
    'new_xp', v_profile.xp,
    'old_level', v_old_level,
    'new_level', v_new_level,
    'level_up', v_new_level > v_old_level,
    'leveled_up', v_new_level > v_old_level,
    'diamonds_rewarded', v_diamonds_rewarded,
    'next_level_xp', v_new_level * v_new_level * 1000
  );
END;
$$;

REVOKE ALL ON FUNCTION public.add_xp_with_multiplier(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_xp_with_multiplier(uuid, integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.claim_calendar_reward(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_calendar_reward(uuid) TO authenticated, service_role;

COMMIT;
