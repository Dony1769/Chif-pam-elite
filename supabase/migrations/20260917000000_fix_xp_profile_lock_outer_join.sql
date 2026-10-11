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
  FOR UPDATE OF prof;

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

COMMIT;