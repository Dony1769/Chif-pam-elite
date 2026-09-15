BEGIN;

CREATE OR REPLACE FUNCTION public.uno_get_player_profiles(p_room_id uuid)
RETURNS TABLE(user_id uuid, username text)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.room_players rp_check
    WHERE rp_check.room_id = p_room_id AND rp_check.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Acces reserve aux participants';
  END IF;
  RETURN QUERY
  SELECT rp.user_id, p.username
  FROM public.room_players rp
  JOIN public.profiles p ON p.id = rp.user_id
  WHERE rp.room_id = p_room_id
  ORDER BY rp.seat;
END;
$$;

REVOKE ALL ON FUNCTION public.uno_get_player_profiles(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.uno_get_player_profiles(uuid) TO authenticated;

COMMIT;
