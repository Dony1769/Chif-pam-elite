BEGIN;

REVOKE ALL ON public.mission_pool FROM anon, authenticated;
GRANT SELECT ON public.mission_pool TO authenticated;

DROP POLICY IF EXISTS mission_pool_admin_all ON public.mission_pool;
CREATE POLICY mission_pool_admin_all
  ON public.mission_pool
  FOR ALL
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

CREATE OR REPLACE FUNCTION public.get_or_create_daily_missions(p_user_id uuid)
RETURNS SETOF public.user_daily_missions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF auth.role() NOT IN ('authenticated', 'service_role') THEN
    RAISE EXCEPTION 'Authenticated user required';
  END IF;

  IF auth.role() = 'authenticated' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.user_daily_missions
  WHERE user_id = p_user_id
    AND assigned_date = CURRENT_DATE;

  IF v_count = 0 THEN
    DELETE FROM public.user_daily_missions
    WHERE user_id = p_user_id;

    INSERT INTO public.user_daily_missions (
      user_id,
      mission_code,
      target_count,
      description,
      reward_type,
      reward_amount,
      icon_name
    )
    SELECT
      p_user_id,
      code,
      target_count,
      description,
      reward_type,
      reward_amount,
      CASE
        WHEN action_trigger LIKE '%crash%' THEN 'TrendingUp'
        WHEN action_trigger LIKE '%mines%' THEN 'Bomb'
        WHEN action_trigger LIKE '%plinko%' THEN 'ArrowDownCircle'
        ELSE 'Trophy'
      END
    FROM public.mission_pool
    ORDER BY random()
    LIMIT 3;
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.user_daily_missions
  WHERE user_id = p_user_id
  ORDER BY is_claimed ASC, progress DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_daily_missions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_daily_missions(uuid) TO authenticated, service_role;

COMMIT;