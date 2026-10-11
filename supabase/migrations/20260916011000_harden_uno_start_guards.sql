BEGIN;

CREATE OR REPLACE FUNCTION public.uno_start_match(p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.rooms;
  v_player_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Salle introuvable';
  END IF;
  IF v_room.host_id <> auth.uid() THEN
    RAISE EXCEPTION 'Seul l''hote peut demarrer';
  END IF;
  IF v_room.status <> 'waiting' THEN
    RAISE EXCEPTION 'Match deja demarre';
  END IF;
  IF v_room.expires_at IS NOT NULL AND v_room.expires_at <= now() THEN
    RAISE EXCEPTION 'Cette salle a expire';
  END IF;

  SELECT count(*) INTO v_player_count
  FROM public.room_players
  WHERE room_id = p_room_id;
  IF v_player_count <> v_room.max_players THEN
    RAISE EXCEPTION 'La salle doit etre pleine avant le demarrage';
  END IF;

  RETURN public.uno_start_match_internal(p_room_id);
END;
$$;

REVOKE ALL ON FUNCTION public.uno_start_match_internal(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.uno_start_match_internal(uuid) TO service_role;

COMMIT;