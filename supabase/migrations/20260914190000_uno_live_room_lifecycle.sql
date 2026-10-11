BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

UPDATE public.rooms
SET expires_at = created_at + interval '8 minutes'
WHERE status = 'waiting' AND expires_at IS NULL;

ALTER TABLE public.rooms
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '8 minutes');

CREATE INDEX IF NOT EXISTS idx_uno_rooms_waiting_expiry
  ON public.rooms(status, expires_at)
  WHERE status = 'waiting';

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
  IF v_count < 2 THEN RAISE EXCEPTION 'Il faut au moins 2 joueurs'; END IF;

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

CREATE OR REPLACE FUNCTION public.uno_process_expired_rooms()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room record;
  v_player record;
  v_count integer := 0;
BEGIN
  FOR v_room IN
    SELECT id, match_code
    FROM public.rooms
    WHERE status = 'waiting' AND expires_at <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    FOR v_player IN
      SELECT user_id, bet_cp
      FROM public.room_players
      WHERE room_id = v_room.id
      FOR UPDATE
    LOOP
      UPDATE public.profiles
      SET jetons_cp = coalesce(jetons_cp, 0) + v_player.bet_cp
      WHERE id = v_player.user_id;

      INSERT INTO public.jetons_transactions(user_id, type, montant_cp, details)
      VALUES (v_player.user_id, 'uno_refund', v_player.bet_cp, 'Remboursement UNO - expiration ' || v_room.match_code);
    END LOOP;

    UPDATE public.rooms
    SET status = 'cancelled', pot_cp = 0, finished_at = now()
    WHERE id = v_room.id AND status = 'waiting';
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.uno_create_room(p_min_bet bigint, p_max_players smallint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_room_id uuid;
  v_code text;
  v_cp bigint;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF p_min_bet < 10 OR p_min_bet > 1000000 THEN RAISE EXCEPTION 'Mise comprise entre 10 et 1 000 000 CP'; END IF;
  IF p_max_players NOT BETWEEN 2 AND 4 THEN RAISE EXCEPTION 'Une salle doit accepter 2 à 4 joueurs'; END IF;
  SELECT jetons_cp INTO v_cp FROM public.profiles WHERE id = v_user FOR UPDATE;
  IF coalesce(v_cp, 0) < p_min_bet THEN RAISE EXCEPTION 'Solde CP insuffisant'; END IF;

  LOOP
    v_code := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.rooms WHERE match_code = v_code);
  END LOOP;

  UPDATE public.profiles SET jetons_cp = jetons_cp - p_min_bet WHERE id = v_user;
  INSERT INTO public.rooms(match_code, host_id, min_bet, max_players, pot_cp, expires_at)
  VALUES (v_code, v_user, p_min_bet, p_max_players, p_min_bet, now() + interval '8 minutes')
  RETURNING id INTO v_room_id;
  INSERT INTO public.room_players(room_id, user_id, seat, bet_cp) VALUES (v_room_id, v_user, 0, p_min_bet);
  INSERT INTO public.jetons_transactions(user_id, type, montant_cp, details)
  VALUES (v_user, 'uno_bet', -p_min_bet, 'Mise UNO - creation ' || v_code);
  RETURN jsonb_build_object('room_id', v_room_id, 'match_code', v_code, 'min_bet', p_min_bet, 'expires_at', now() + interval '8 minutes');
END;
$$;

CREATE OR REPLACE FUNCTION public.uno_join_room(p_match_code text, p_bet bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_room public.rooms;
  v_cp bigint;
  v_seat smallint;
  v_count integer;
  v_started jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  PERFORM public.uno_process_expired_rooms();
  SELECT * INTO v_room FROM public.rooms WHERE match_code = upper(trim(p_match_code)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Salle introuvable'; END IF;
  IF v_room.status <> 'waiting' THEN RAISE EXCEPTION 'Cette salle n''accepte plus de joueurs'; END IF;
  IF v_room.expires_at <= now() THEN RAISE EXCEPTION 'Cette salle a expire'; END IF;
  IF EXISTS (SELECT 1 FROM public.room_players WHERE room_id = v_room.id AND user_id = v_user) THEN
    RETURN jsonb_build_object('room_id', v_room.id, 'match_code', v_room.match_code, 'already_joined', true, 'status', v_room.status);
  END IF;
  IF p_bet < v_room.min_bet THEN RAISE EXCEPTION 'La mise doit etre au moins de % CP', v_room.min_bet; END IF;
  SELECT count(*) INTO v_count FROM public.room_players WHERE room_id = v_room.id;
  IF v_count >= v_room.max_players THEN RAISE EXCEPTION 'Salle complete'; END IF;
  SELECT jetons_cp INTO v_cp FROM public.profiles WHERE id = v_user FOR UPDATE;
  IF coalesce(v_cp, 0) < p_bet THEN RAISE EXCEPTION 'Solde CP insuffisant'; END IF;
  SELECT coalesce(max(seat) + 1, 0) INTO v_seat FROM public.room_players WHERE room_id = v_room.id;
  UPDATE public.profiles SET jetons_cp = jetons_cp - p_bet WHERE id = v_user;
  INSERT INTO public.room_players(room_id, user_id, seat, bet_cp) VALUES (v_room.id, v_user, v_seat, p_bet);
  UPDATE public.rooms SET pot_cp = pot_cp + p_bet WHERE id = v_room.id;
  INSERT INTO public.jetons_transactions(user_id, type, montant_cp, details)
  VALUES (v_user, 'uno_bet', -p_bet, 'Mise UNO - rejoint ' || v_room.match_code);

  SELECT count(*) INTO v_count FROM public.room_players WHERE room_id = v_room.id;
  IF v_count >= v_room.max_players THEN
    v_started := public.uno_start_match_internal(v_room.id);
  END IF;
  RETURN jsonb_build_object('room_id', v_room.id, 'match_code', v_room.match_code, 'already_joined', false,
    'status', coalesce(v_started->>'status', 'waiting'));
END;
$$;

CREATE OR REPLACE FUNCTION public.uno_find_room(p_match_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_room public.rooms;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  PERFORM public.uno_process_expired_rooms();
  SELECT * INTO v_room FROM public.rooms WHERE match_code = upper(trim(p_match_code));
  IF NOT FOUND THEN RAISE EXCEPTION 'Salle introuvable'; END IF;
  RETURN jsonb_build_object('id', v_room.id, 'match_code', v_room.match_code, 'min_bet', v_room.min_bet,
    'max_players', v_room.max_players, 'status', v_room.status,
    'players_count', (SELECT count(*) FROM public.room_players WHERE room_id = v_room.id), 'expires_at', v_room.expires_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.uno_start_match(p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_room public.rooms;
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
REVOKE ALL ON FUNCTION public.uno_process_expired_rooms() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.uno_find_room(text), public.uno_create_room(bigint, smallint), public.uno_join_room(text, bigint), public.uno_start_match(uuid) TO authenticated;

SELECT cron.schedule('uno-expire-rooms', '* * * * *', $job$SELECT public.uno_process_expired_rooms();$job$)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'uno-expire-rooms');

COMMIT;