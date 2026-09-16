BEGIN;

CREATE OR REPLACE FUNCTION public.uno_draw_card(p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_room public.rooms;
  v_player public.room_players;
  v_card jsonb;
  v_deck jsonb;
  v_hand jsonb;
  v_ids uuid[];
  v_count integer;
  v_index integer;
  v_next uuid;
  v_playable boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Salle introuvable';
  END IF;
  SELECT * INTO v_player
  FROM public.room_players
  WHERE room_id = p_room_id AND user_id = v_user
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vous ne faites pas partie de cette salle';
  END IF;
  IF v_room.status <> 'playing' OR v_room.current_turn <> v_user THEN
    RAISE EXCEPTION 'Ce n''est pas votre tour';
  END IF;
  IF v_room.turn_deadline_at IS NOT NULL AND v_room.turn_deadline_at <= now() THEN
    SELECT array_agg(user_id ORDER BY seat) INTO v_ids FROM public.room_players WHERE room_id = p_room_id;
    v_count := array_length(v_ids, 1);
    v_index := array_position(v_ids, v_user);
    v_next := v_ids[((v_index - 1 + v_room.turn_direction + (v_count * 10)) % v_count) + 1];
    UPDATE public.rooms
    SET current_turn = v_next, turn_number = turn_number + 1,
        turn_started_at = now(), turn_deadline_at = now() + interval '45 seconds'
    WHERE id = p_room_id;
    RAISE EXCEPTION 'Tour expire';
  END IF;

  v_deck := v_room.deck;
  v_hand := v_player.hand;
  SELECT count(*) INTO v_count FROM public.room_players WHERE room_id = p_room_id;
  LOOP
    v_card := v_deck -> 0;
    IF v_card IS NULL THEN
      RAISE EXCEPTION 'La pioche est vide';
    END IF;
    v_deck := (
      SELECT coalesce(jsonb_agg(value ORDER BY ordinality), '[]'::jsonb)
      FROM jsonb_array_elements(v_deck) WITH ORDINALITY
      WHERE ordinality > 1
    );
    v_hand := v_hand || jsonb_build_array(v_card);
    v_playable := v_card->>'color' = 'black'
      OR v_card->>'color' = v_room.current_color
      OR v_card->>'value' = v_room.top_card->>'value';
    EXIT WHEN v_count > 2 OR v_playable;
  END LOOP;

  UPDATE public.room_players SET hand = v_hand WHERE room_id = p_room_id AND user_id = v_user;
  IF v_count > 2 AND NOT v_playable THEN
    SELECT array_agg(user_id ORDER BY seat) INTO v_ids FROM public.room_players WHERE room_id = p_room_id;
    v_index := array_position(v_ids, v_user);
    v_next := v_ids[((v_index - 1 + v_room.turn_direction + (v_count * 10)) % v_count) + 1];
    UPDATE public.rooms
    SET deck = v_deck, current_turn = v_next, turn_number = turn_number + 1,
        turn_started_at = now(), turn_deadline_at = now() + interval '45 seconds'
    WHERE id = p_room_id;
  ELSE
    UPDATE public.rooms SET deck = v_deck WHERE id = p_room_id;
  END IF;

  RETURN jsonb_build_object(
    'room_id', p_room_id,
    'drawn_card_id', v_card->>'id',
    'drawn_card_playable', v_playable,
    'cards_drawn', jsonb_array_length(v_hand) - jsonb_array_length(v_player.hand)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.uno_draw_card(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.uno_draw_card(uuid) TO authenticated, service_role;

COMMIT;