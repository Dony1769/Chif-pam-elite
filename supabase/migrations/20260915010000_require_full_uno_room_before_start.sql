BEGIN;

CREATE OR REPLACE FUNCTION public.uno_start_match_internal(p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.rooms;
  v_deck jsonb;
  v_top jsonb;
  v_count integer;
  v_index integer := 0;
  v_player record;
BEGIN
  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND OR v_room.status <> 'waiting' THEN
    RETURN jsonb_build_object('room_id', p_room_id, 'status', coalesce(v_room.status, 'missing'));
  END IF;

  SELECT count(*) INTO v_count FROM public.room_players WHERE room_id = p_room_id;
  IF v_count <> v_room.max_players THEN RAISE EXCEPTION 'La salle doit etre pleine avant le demarrage'; END IF;

  v_deck := public.uno_build_deck();
  FOR v_player IN SELECT user_id FROM public.room_players WHERE room_id = p_room_id ORDER BY seat LOOP
    UPDATE public.room_players
    SET hand = (SELECT jsonb_agg(value) FROM jsonb_array_elements(v_deck) WITH ORDINALITY WHERE ordinality > v_index * 7 AND ordinality <= (v_index + 1) * 7)
    WHERE room_id = p_room_id AND user_id = v_player.user_id;
    v_index := v_index + 1;
  END LOOP;

  v_deck := (SELECT coalesce(jsonb_agg(value ORDER BY ordinality), '[]'::jsonb) FROM jsonb_array_elements(v_deck) WITH ORDINALITY WHERE ordinality > v_count * 7);
  v_top := v_deck -> 0;
  v_deck := (SELECT coalesce(jsonb_agg(value ORDER BY ordinality), '[]'::jsonb) FROM jsonb_array_elements(v_deck) WITH ORDINALITY WHERE ordinality > 1);

  UPDATE public.rooms
  SET status = 'playing', started_at = now(), deck = v_deck,
      top_card = v_top, discard_pile = jsonb_build_array(v_top), current_color = v_top->>'color',
      current_turn = (SELECT user_id FROM public.room_players WHERE room_id = p_room_id ORDER BY seat LIMIT 1),
      turn_number = 1
  WHERE id = p_room_id;

  RETURN jsonb_build_object('room_id', p_room_id, 'status', 'playing');
END;
$$;

CREATE OR REPLACE FUNCTION public.uno_start_match(p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.rooms;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id;
  IF v_room.host_id <> auth.uid() THEN RAISE EXCEPTION 'Seul l''hote peut demarrer'; END IF;
  IF v_room.expires_at <= now() THEN
    PERFORM public.uno_process_expired_rooms();
    RAISE EXCEPTION 'Cette salle a expire';
  END IF;
  RETURN public.uno_start_match_internal(p_room_id);
END;
$$;

REVOKE ALL ON FUNCTION public.uno_start_match_internal(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.uno_start_match(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.uno_start_match(uuid) TO authenticated;

COMMIT;