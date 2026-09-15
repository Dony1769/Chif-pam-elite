BEGIN;

ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS turn_started_at timestamptz;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS turn_deadline_at timestamptz;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS final_standings jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.uno_card_points(p_card jsonb)
RETURNS integer
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_card->>'color' = 'black' THEN 50
    WHEN p_card->>'value' IN ('skip', 'reverse', 'draw2') THEN 20
    ELSE COALESCE((p_card->>'value')::integer, 0)
  END;
$$;

CREATE OR REPLACE FUNCTION public.uno_start_match_internal(p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_room public.rooms; v_deck jsonb; v_top jsonb; v_count integer; v_index integer := 0; v_player record;
BEGIN
  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND OR v_room.status <> 'waiting' THEN
    RETURN jsonb_build_object('room_id', p_room_id, 'status', coalesce(v_room.status, 'missing'));
  END IF;
  SELECT count(*) INTO v_count FROM public.room_players WHERE room_id = p_room_id;
  IF v_count <> v_room.max_players THEN RAISE EXCEPTION 'La salle doit etre pleine avant le demarrage'; END IF;
  v_deck := public.uno_build_deck();
  FOR v_player IN SELECT user_id FROM public.room_players WHERE room_id = p_room_id ORDER BY seat LOOP
    UPDATE public.room_players SET hand = (SELECT jsonb_agg(value) FROM jsonb_array_elements(v_deck) WITH ORDINALITY WHERE ordinality > v_index * 7 AND ordinality <= (v_index + 1) * 7) WHERE room_id = p_room_id AND user_id = v_player.user_id;
    v_index := v_index + 1;
  END LOOP;
  v_deck := (SELECT coalesce(jsonb_agg(value ORDER BY ordinality), '[]'::jsonb) FROM jsonb_array_elements(v_deck) WITH ORDINALITY WHERE ordinality > v_count * 7);
  v_top := v_deck -> 0;
  v_deck := (SELECT coalesce(jsonb_agg(value ORDER BY ordinality), '[]'::jsonb) FROM jsonb_array_elements(v_deck) WITH ORDINALITY WHERE ordinality > 1);
  UPDATE public.rooms SET status = 'playing', started_at = now(), turn_started_at = now(), turn_deadline_at = now() + interval '45 seconds', deck = v_deck, top_card = v_top, discard_pile = jsonb_build_array(v_top), current_color = v_top->>'color', current_turn = (SELECT user_id FROM public.room_players WHERE room_id = p_room_id ORDER BY seat LIMIT 1), turn_number = 1 WHERE id = p_room_id;
  RETURN jsonb_build_object('room_id', p_room_id, 'status', 'playing');
END;
$$;

CREATE OR REPLACE FUNCTION public.uno_play_card(p_room_id uuid, p_card_id text, p_color text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid(); v_room public.rooms; v_player public.room_players; v_card jsonb; v_next uuid;
  v_ids uuid[]; v_count integer; v_index integer; v_steps integer := 1; v_direction smallint;
  v_draw_count integer := 0; v_hand jsonb; v_deck jsonb; v_drawn jsonb; v_penalty_user uuid; v_winner_bonus bigint := 0; v_vip text; v_standings jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id FOR UPDATE;
  SELECT * INTO v_player FROM public.room_players WHERE room_id = p_room_id AND user_id = v_user FOR UPDATE;
  IF v_room.status <> 'playing' OR v_room.current_turn <> v_user THEN RAISE EXCEPTION 'Ce n''est pas votre tour'; END IF;
  IF v_room.turn_deadline_at IS NOT NULL AND v_room.turn_deadline_at <= now() THEN
    SELECT array_agg(user_id ORDER BY seat) INTO v_ids FROM public.room_players WHERE room_id = p_room_id;
    v_count := array_length(v_ids, 1); v_index := array_position(v_ids, v_user);
    v_next := v_ids[((v_index - 1 + v_room.turn_direction + (v_count * 10)) % v_count) + 1];
    UPDATE public.rooms SET current_turn = v_next, turn_number = turn_number + 1, turn_started_at = now(), turn_deadline_at = now() + interval '45 seconds' WHERE id = p_room_id;
    RAISE EXCEPTION 'Tour expire';
  END IF;
  SELECT value INTO v_card FROM jsonb_array_elements(v_player.hand) WHERE value->>'id' = p_card_id;
  IF v_card IS NULL THEN RAISE EXCEPTION 'Carte absente de votre main'; END IF;
  IF v_card->>'color' <> 'black' AND v_card->>'color' <> v_room.current_color AND v_card->>'value' <> v_room.top_card->>'value' THEN RAISE EXCEPTION 'Carte injouable'; END IF;
  IF v_card->>'value' = 'wild4' AND EXISTS (SELECT 1 FROM jsonb_array_elements(v_player.hand) c WHERE c->>'color' <> 'black' AND c->>'color' = v_room.current_color) THEN RAISE EXCEPTION 'Le +4 ne peut etre joue que sans carte de couleur'; END IF;
  IF v_card->>'color' = 'black' AND coalesce(p_color, '') NOT IN ('red', 'yellow', 'green', 'blue') THEN RAISE EXCEPTION 'Choisissez une couleur'; END IF;
  v_hand := (SELECT coalesce(jsonb_agg(value), '[]'::jsonb) FROM jsonb_array_elements(v_player.hand) WHERE value->>'id' <> p_card_id);
  UPDATE public.room_players SET hand = v_hand WHERE room_id = p_room_id AND user_id = v_user;
  SELECT array_agg(user_id ORDER BY seat) INTO v_ids FROM public.room_players WHERE room_id = p_room_id;
  v_count := array_length(v_ids, 1); v_index := array_position(v_ids, v_user); v_deck := v_room.deck;
  IF v_card->>'value' = 'draw2' THEN v_draw_count := 2; END IF;
  IF v_card->>'value' = 'wild4' THEN v_draw_count := 4; END IF;
  IF v_draw_count > 0 THEN
    v_drawn := (SELECT coalesce(jsonb_agg(value ORDER BY ordinality), '[]'::jsonb) FROM jsonb_array_elements(v_deck) WITH ORDINALITY WHERE ordinality <= v_draw_count);
    v_deck := (SELECT coalesce(jsonb_agg(value ORDER BY ordinality), '[]'::jsonb) FROM jsonb_array_elements(v_deck) WITH ORDINALITY WHERE ordinality > v_draw_count);
    v_penalty_user := v_ids[((v_index - 1 + v_room.turn_direction + (v_count * 10)) % v_count) + 1];
    UPDATE public.room_players SET hand = hand || v_drawn WHERE room_id = p_room_id AND user_id = v_penalty_user;
    v_steps := 2;
  END IF;
  IF v_card->>'value' = 'skip' THEN v_steps := 2; END IF;
  IF v_card->>'value' = 'reverse' THEN
    IF v_count = 2 THEN v_steps := 0; ELSE v_direction := -v_room.turn_direction; END IF;
  END IF;
  IF v_direction IS NULL THEN v_direction := v_room.turn_direction; END IF;
  v_next := v_ids[((v_index - 1 + (v_steps * v_direction) + (v_count * 10)) % v_count) + 1];
  UPDATE public.rooms SET deck = v_deck, discard_pile = discard_pile || jsonb_build_array(v_card), top_card = v_card, current_color = CASE WHEN v_card->>'color' = 'black' THEN p_color ELSE v_card->>'color' END, turn_direction = v_direction, current_turn = v_next, turn_number = turn_number + 1, turn_started_at = now(), turn_deadline_at = now() + interval '45 seconds' WHERE id = p_room_id;
  IF jsonb_array_length(v_hand) = 0 THEN
    SELECT vip_status INTO v_vip FROM public.profiles WHERE id = v_user;
    IF coalesce(v_vip, 'free') <> 'free' THEN v_winner_bonus := floor(v_room.pot_cp * 0.05); END IF;
    SELECT coalesce(jsonb_agg(jsonb_build_object('user_id', rp.user_id, 'username', p.username, 'score', rp.score) ORDER BY rp.score, rp.seat), '[]'::jsonb) INTO v_standings
    FROM (SELECT rp.*, (SELECT coalesce(sum(public.uno_card_points(card)), 0) FROM jsonb_array_elements(rp.hand) card) AS score FROM public.room_players rp WHERE rp.room_id = p_room_id) rp LEFT JOIN public.profiles p ON p.id = rp.user_id;
    UPDATE public.profiles SET jetons_cp = jetons_cp + v_room.pot_cp + v_winner_bonus WHERE id = v_user;
    INSERT INTO public.matches(room_id, winner_id, pot_cp, vip_bonus_cp, final_standings, players_snapshot) SELECT p_room_id, v_user, v_room.pot_cp, v_winner_bonus, v_standings, coalesce(jsonb_agg(jsonb_build_object('user_id', user_id, 'bet_cp', bet_cp)), '[]'::jsonb) FROM public.room_players WHERE room_id = p_room_id;
    UPDATE public.rooms SET status = 'finished', winner_id = v_user, vip_bonus_cp = v_winner_bonus, finished_at = now(), current_turn = NULL, turn_started_at = NULL, turn_deadline_at = NULL WHERE id = p_room_id;
    INSERT INTO public.jetons_transactions(user_id, type, montant_cp, details) VALUES (v_user, 'uno_win', v_room.pot_cp + v_winner_bonus, 'Victoire UNO ' || v_room.match_code);
  END IF;
  RETURN jsonb_build_object('room_id', p_room_id, 'played_card', v_card->>'id', 'status', CASE WHEN jsonb_array_length(v_hand) = 0 THEN 'finished' ELSE 'playing' END);
END;
$$;

CREATE OR REPLACE FUNCTION public.uno_draw_card(p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid(); v_room public.rooms; v_player public.room_players; v_card jsonb; v_deck jsonb; v_hand jsonb; v_ids uuid[]; v_count integer; v_index integer; v_next uuid; v_playable boolean;
BEGIN
  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id FOR UPDATE;
  SELECT * INTO v_player FROM public.room_players WHERE room_id = p_room_id AND user_id = v_user FOR UPDATE;
  IF v_room.status <> 'playing' OR v_room.current_turn <> v_user THEN RAISE EXCEPTION 'Ce n''est pas votre tour'; END IF;
  IF v_room.turn_deadline_at IS NOT NULL AND v_room.turn_deadline_at <= now() THEN
    SELECT array_agg(user_id ORDER BY seat) INTO v_ids FROM public.room_players WHERE room_id = p_room_id;
    v_count := array_length(v_ids, 1); v_index := array_position(v_ids, v_user); v_next := v_ids[((v_index - 1 + v_room.turn_direction + (v_count * 10)) % v_count) + 1];
    UPDATE public.rooms SET current_turn = v_next, turn_number = turn_number + 1, turn_started_at = now(), turn_deadline_at = now() + interval '45 seconds' WHERE id = p_room_id;
    RAISE EXCEPTION 'Tour expire';
  END IF;
  v_deck := v_room.deck; v_hand := v_player.hand; SELECT count(*) INTO v_count FROM public.room_players WHERE room_id = p_room_id;
  LOOP
    v_card := v_deck -> 0;
    IF v_card IS NULL THEN RAISE EXCEPTION 'La pioche est vide'; END IF;
    v_deck := (SELECT coalesce(jsonb_agg(value ORDER BY ordinality), '[]'::jsonb) FROM jsonb_array_elements(v_deck) WITH ORDINALITY WHERE ordinality > 1);
    v_hand := v_hand || jsonb_build_array(v_card);
    v_playable := v_card->>'color' = 'black' OR v_card->>'color' = v_room.current_color OR v_card->>'value' = v_room.top_card->>'value';
    EXIT WHEN v_count > 2 OR v_playable;
  END LOOP;
  UPDATE public.room_players SET hand = v_hand WHERE room_id = p_room_id AND user_id = v_user;
  IF v_count > 2 AND NOT v_playable THEN
    SELECT array_agg(user_id ORDER BY seat) INTO v_ids FROM public.room_players WHERE room_id = p_room_id;
    v_index := array_position(v_ids, v_user); v_next := v_ids[((v_index - 1 + v_room.turn_direction + (v_count * 10)) % v_count) + 1];
    UPDATE public.rooms SET deck = v_deck, current_turn = v_next, turn_number = turn_number + 1, turn_started_at = now(), turn_deadline_at = now() + interval '45 seconds' WHERE id = p_room_id;
  ELSE
    UPDATE public.rooms SET deck = v_deck WHERE id = p_room_id;
  END IF;
  RETURN jsonb_build_object('room_id', p_room_id, 'drawn_card_id', v_card->>'id', 'drawn_card_playable', v_playable, 'cards_drawn', jsonb_array_length(v_hand) - jsonb_array_length(v_player.hand));
END;
$$;

REVOKE ALL ON FUNCTION public.uno_card_points(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.uno_start_match_internal(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.uno_start_match_internal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.uno_play_card(uuid, text, text), public.uno_draw_card(uuid) TO authenticated;

COMMIT;
