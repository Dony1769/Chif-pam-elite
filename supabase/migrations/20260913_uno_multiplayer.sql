BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_code varchar(6) NOT NULL UNIQUE,
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  min_bet bigint NOT NULL CHECK (min_bet > 0),
  max_players smallint NOT NULL CHECK (max_players BETWEEN 2 AND 4),
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished', 'cancelled')),
  pot_cp bigint NOT NULL DEFAULT 0 CHECK (pot_cp >= 0),
  current_turn uuid NULL REFERENCES auth.users(id),
  current_color text NULL CHECK (current_color IN ('red', 'yellow', 'green', 'blue', 'black')),
  top_card jsonb NOT NULL DEFAULT '{}'::jsonb,
  discard_pile jsonb NOT NULL DEFAULT '[]'::jsonb,
  deck jsonb NOT NULL DEFAULT '[]'::jsonb,
  turn_direction smallint NOT NULL DEFAULT 1 CHECK (turn_direction IN (-1, 1)),
  turn_number integer NOT NULL DEFAULT 0,
  winner_id uuid NULL REFERENCES auth.users(id),
  vip_bonus_cp bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz NULL,
  finished_at timestamptz NULL
);

CREATE TABLE IF NOT EXISTS public.room_players (
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seat smallint NOT NULL CHECK (seat BETWEEN 0 AND 3),
  bet_cp bigint NOT NULL CHECK (bet_cp > 0),
  hand jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_connected boolean NOT NULL DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id),
  UNIQUE (room_id, seat)
);

CREATE TABLE IF NOT EXISTS public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL UNIQUE REFERENCES public.rooms(id) ON DELETE CASCADE,
  winner_id uuid NOT NULL REFERENCES auth.users(id),
  pot_cp bigint NOT NULL CHECK (pot_cp >= 0),
  vip_bonus_cp bigint NOT NULL DEFAULT 0 CHECK (vip_bonus_cp >= 0),
  players_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uno_rooms_status ON public.rooms(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uno_room_players_user ON public.room_players(user_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_uno_matches_winner ON public.matches(winner_id, created_at DESC);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.uno_is_room_participant(p_room_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_players
    WHERE room_id = p_room_id AND user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS uno_rooms_select_participant ON public.rooms;
CREATE POLICY uno_rooms_select_participant ON public.rooms
  FOR SELECT TO authenticated
  USING (
    host_id = auth.uid()
    OR public.uno_is_room_participant(id)
  );

DROP POLICY IF EXISTS uno_room_players_select_participant ON public.room_players;
CREATE POLICY uno_room_players_select_participant ON public.room_players
  FOR SELECT TO authenticated
  USING (public.uno_is_room_participant(room_id));

DROP POLICY IF EXISTS uno_matches_select_participant ON public.matches;
CREATE POLICY uno_matches_select_participant ON public.matches
  FOR SELECT TO authenticated
  USING (public.uno_is_room_participant(room_id));

REVOKE ALL ON TABLE public.rooms, public.room_players, public.matches FROM anon, authenticated;
GRANT SELECT ON TABLE public.rooms, public.room_players, public.matches TO authenticated;

CREATE OR REPLACE FUNCTION public.uno_build_deck()
RETURNS jsonb
LANGUAGE sql
VOLATILE
AS $$
  SELECT coalesce(jsonb_agg(card ORDER BY random_key), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object('id', 'r-' || row_number() OVER (), 'color', color, 'value', value) AS card, random() AS random_key
    FROM (
      SELECT color, '0' AS value FROM unnest(ARRAY['red', 'yellow', 'green', 'blue']) AS color
      UNION ALL
      SELECT color, value
      FROM unnest(ARRAY['red', 'yellow', 'green', 'blue']) AS color
      CROSS JOIN unnest(ARRAY['1','2','3','4','5','6','7','8','9','skip','reverse','draw2']) AS value
      UNION ALL
      SELECT color, value
      FROM unnest(ARRAY['red', 'yellow', 'green', 'blue']) AS color
      CROSS JOIN unnest(ARRAY['1','2','3','4','5','6','7','8','9','skip','reverse','draw2']) AS value
      UNION ALL
      SELECT 'black', 'wild' FROM generate_series(1, 4)
      UNION ALL
      SELECT 'black', 'wild4' FROM generate_series(1, 4)
    ) cards
  ) shuffled;
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
  SELECT * INTO v_room FROM public.rooms WHERE match_code = upper(trim(p_match_code));
  IF NOT FOUND THEN RAISE EXCEPTION 'Salle introuvable'; END IF;
  RETURN jsonb_build_object(
    'id', v_room.id, 'match_code', v_room.match_code, 'min_bet', v_room.min_bet,
    'max_players', v_room.max_players, 'status', v_room.status,
    'players_count', (SELECT count(*) FROM public.room_players WHERE room_id = v_room.id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.uno_create_room(p_min_bet bigint, p_max_players smallint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid(); v_room_id uuid; v_code text; v_cp bigint;
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
  INSERT INTO public.rooms(match_code, host_id, min_bet, max_players, pot_cp)
  VALUES (v_code, v_user, p_min_bet, p_max_players, p_min_bet) RETURNING id INTO v_room_id;
  INSERT INTO public.room_players(room_id, user_id, seat, bet_cp) VALUES (v_room_id, v_user, 0, p_min_bet);
  INSERT INTO public.jetons_transactions(user_id, type, montant_cp, details)
  VALUES (v_user, 'uno_bet', -p_min_bet, 'Mise UNO - creation ' || v_code);
  RETURN jsonb_build_object('room_id', v_room_id, 'match_code', v_code, 'min_bet', p_min_bet);
END;
$$;

CREATE OR REPLACE FUNCTION public.uno_join_room(p_match_code text, p_bet bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid(); v_room public.rooms; v_cp bigint; v_seat smallint;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  SELECT * INTO v_room FROM public.rooms WHERE match_code = upper(trim(p_match_code)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Salle introuvable'; END IF;
  IF v_room.status <> 'waiting' THEN RAISE EXCEPTION 'Cette salle n''accepte plus de joueurs'; END IF;
  IF EXISTS (SELECT 1 FROM public.room_players WHERE room_id = v_room.id AND user_id = v_user) THEN
    RETURN jsonb_build_object('room_id', v_room.id, 'match_code', v_room.match_code, 'already_joined', true);
  END IF;
  IF p_bet < v_room.min_bet THEN RAISE EXCEPTION 'La mise doit etre au moins de % CP', v_room.min_bet; END IF;
  IF (SELECT count(*) FROM public.room_players WHERE room_id = v_room.id) >= v_room.max_players THEN RAISE EXCEPTION 'Salle complete'; END IF;
  SELECT jetons_cp INTO v_cp FROM public.profiles WHERE id = v_user FOR UPDATE;
  IF coalesce(v_cp, 0) < p_bet THEN RAISE EXCEPTION 'Solde CP insuffisant'; END IF;
  SELECT coalesce(max(seat) + 1, 0) INTO v_seat FROM public.room_players WHERE room_id = v_room.id;
  UPDATE public.profiles SET jetons_cp = jetons_cp - p_bet WHERE id = v_user;
  INSERT INTO public.room_players(room_id, user_id, seat, bet_cp) VALUES (v_room.id, v_user, v_seat, p_bet);
  UPDATE public.rooms SET pot_cp = pot_cp + p_bet WHERE id = v_room.id;
  INSERT INTO public.jetons_transactions(user_id, type, montant_cp, details)
  VALUES (v_user, 'uno_bet', -p_bet, 'Mise UNO - rejoint ' || v_room.match_code);
  RETURN jsonb_build_object('room_id', v_room.id, 'match_code', v_room.match_code, 'already_joined', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.uno_start_match(p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.rooms; v_deck jsonb; v_top jsonb; v_count integer; v_index integer := 0; v_player record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id FOR UPDATE;
  IF v_room.host_id <> auth.uid() THEN RAISE EXCEPTION 'Seul l''hote peut demarrer'; END IF;
  IF v_room.status <> 'waiting' THEN RAISE EXCEPTION 'Match deja demarre'; END IF;
  SELECT count(*) INTO v_count FROM public.room_players WHERE room_id = p_room_id;
  IF v_count < 2 THEN RAISE EXCEPTION 'Il faut au moins 2 joueurs'; END IF;
  v_deck := public.uno_build_deck();
  FOR v_player IN SELECT user_id, seat FROM public.room_players WHERE room_id = p_room_id ORDER BY seat LOOP
    UPDATE public.room_players
    SET hand = (SELECT jsonb_agg(value) FROM jsonb_array_elements(v_deck) WITH ORDINALITY WHERE ordinality > v_index * 7 AND ordinality <= (v_index + 1) * 7)
    WHERE room_id = p_room_id AND user_id = v_player.user_id;
    v_index := v_index + 1;
  END LOOP;
  v_deck := (SELECT coalesce(jsonb_agg(value ORDER BY ordinality), '[]'::jsonb) FROM jsonb_array_elements(v_deck) WITH ORDINALITY WHERE ordinality > v_count * 7);
  v_top := v_deck -> 0;
  v_deck := (SELECT coalesce(jsonb_agg(value ORDER BY ordinality), '[]'::jsonb) FROM jsonb_array_elements(v_deck) WITH ORDINALITY WHERE ordinality > 1);
  UPDATE public.rooms SET status = 'playing', started_at = now(), deck = v_deck,
    top_card = v_top, discard_pile = jsonb_build_array(v_top), current_color = v_top->>'color',
    current_turn = (SELECT user_id FROM public.room_players WHERE room_id = p_room_id ORDER BY seat LIMIT 1), turn_number = 1
  WHERE id = p_room_id;
  RETURN jsonb_build_object('room_id', p_room_id, 'status', 'playing');
END;
$$;

CREATE OR REPLACE FUNCTION public.uno_play_card(p_room_id uuid, p_card_id text, p_color text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid(); v_room public.rooms; v_player public.room_players; v_card jsonb; v_next uuid;
  v_ids uuid[]; v_count integer; v_index integer; v_steps integer := 1; v_direction smallint;
  v_draw_count integer := 0; v_hand jsonb; v_deck jsonb; v_drawn jsonb; v_penalty_user uuid; v_winner_bonus bigint := 0; v_vip text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id FOR UPDATE;
  SELECT * INTO v_player FROM public.room_players WHERE room_id = p_room_id AND user_id = v_user FOR UPDATE;
  IF v_room.status <> 'playing' OR v_room.current_turn <> v_user THEN RAISE EXCEPTION 'Ce n''est pas votre tour'; END IF;
  SELECT value INTO v_card FROM jsonb_array_elements(v_player.hand) WHERE value->>'id' = p_card_id;
  IF v_card IS NULL THEN RAISE EXCEPTION 'Carte absente de votre main'; END IF;
  IF v_card->>'color' <> 'black' AND v_card->>'color' <> v_room.current_color AND v_card->>'value' <> v_room.top_card->>'value' THEN RAISE EXCEPTION 'Carte injouable'; END IF;
  IF v_card->>'value' = 'wild4' AND EXISTS (SELECT 1 FROM jsonb_array_elements(v_player.hand) c WHERE c->>'color' <> 'black' AND c->>'color' = v_room.current_color) THEN RAISE EXCEPTION 'Le +4 ne peut etre joue que sans carte de couleur'; END IF;
  IF v_card->>'color' = 'black' AND coalesce(p_color, '') NOT IN ('red', 'yellow', 'green', 'blue') THEN RAISE EXCEPTION 'Choisissez une couleur'; END IF;
  v_hand := (SELECT coalesce(jsonb_agg(value), '[]'::jsonb) FROM jsonb_array_elements(v_player.hand) WHERE value->>'id' <> p_card_id);
  UPDATE public.room_players SET hand = v_hand WHERE room_id = p_room_id AND user_id = v_user;
  SELECT array_agg(user_id ORDER BY seat) INTO v_ids FROM public.room_players WHERE room_id = p_room_id;
  v_count := array_length(v_ids, 1); v_index := array_position(v_ids, v_user);
  v_deck := v_room.deck;
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
    v_direction := -v_room.turn_direction;
  ELSE
    v_direction := v_room.turn_direction;
  END IF;
  v_next := v_ids[((v_index - 1 + (v_steps * v_direction) + (v_count * 10)) % v_count) + 1];
  UPDATE public.rooms SET deck = v_deck, discard_pile = discard_pile || jsonb_build_array(v_card), top_card = v_card,
    current_color = CASE WHEN v_card->>'color' = 'black' THEN p_color ELSE v_card->>'color' END,
    turn_direction = v_direction, current_turn = v_next, turn_number = turn_number + 1
  WHERE id = p_room_id;
  IF jsonb_array_length(v_hand) = 0 THEN
    SELECT vip_status INTO v_vip FROM public.profiles WHERE id = v_user;
    IF coalesce(v_vip, 'free') <> 'free' THEN v_winner_bonus := floor(v_room.pot_cp * 0.05); END IF;
    UPDATE public.profiles SET jetons_cp = jetons_cp + v_room.pot_cp + v_winner_bonus WHERE id = v_user;
    INSERT INTO public.matches(room_id, winner_id, pot_cp, vip_bonus_cp, players_snapshot)
    SELECT p_room_id, v_user, v_room.pot_cp, v_winner_bonus, coalesce(jsonb_agg(jsonb_build_object('user_id', user_id, 'bet_cp', bet_cp)), '[]'::jsonb) FROM public.room_players WHERE room_id = p_room_id;
    UPDATE public.rooms SET status = 'finished', winner_id = v_user, vip_bonus_cp = v_winner_bonus, finished_at = now(), current_turn = NULL WHERE id = p_room_id;
    INSERT INTO public.jetons_transactions(user_id, type, montant_cp, details)
    VALUES (v_user, 'uno_win', v_room.pot_cp + v_winner_bonus, 'Victoire UNO ' || v_room.match_code);
  END IF;
  RETURN jsonb_build_object('room_id', p_room_id, 'played_card', v_card->>'id', 'status', CASE WHEN jsonb_array_length(v_hand) = 0 THEN 'finished' ELSE 'playing' END);
END;
$$;

CREATE OR REPLACE FUNCTION public.uno_draw_card(p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user uuid := auth.uid(); v_room public.rooms; v_player public.room_players; v_card jsonb; v_deck jsonb;
BEGIN
  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id FOR UPDATE;
  SELECT * INTO v_player FROM public.room_players WHERE room_id = p_room_id AND user_id = v_user FOR UPDATE;
  IF v_room.status <> 'playing' OR v_room.current_turn <> v_user THEN RAISE EXCEPTION 'Ce n''est pas votre tour'; END IF;
  v_card := v_room.deck -> 0;
  IF v_card IS NULL THEN RAISE EXCEPTION 'La pioche est vide'; END IF;
  v_deck := (SELECT coalesce(jsonb_agg(value ORDER BY ordinality), '[]'::jsonb) FROM jsonb_array_elements(v_room.deck) WITH ORDINALITY WHERE ordinality > 1);
  UPDATE public.room_players SET hand = hand || jsonb_build_array(v_card) WHERE room_id = p_room_id AND user_id = v_user;
  UPDATE public.rooms SET deck = v_deck WHERE id = p_room_id;
  RETURN jsonb_build_object('room_id', p_room_id, 'drawn_card_id', v_card->>'id');
END;
$$;

REVOKE ALL ON FUNCTION public.uno_build_deck() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.uno_build_deck() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.uno_find_room(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.uno_create_room(bigint, smallint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.uno_join_room(text, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.uno_start_match(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.uno_play_card(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.uno_draw_card(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.uno_find_room(text), public.uno_create_room(bigint, smallint), public.uno_join_room(text, bigint), public.uno_start_match(uuid), public.uno_play_card(uuid, text, text), public.uno_draw_card(uuid) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rooms') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'room_players') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
  END IF;
END $$;

COMMIT;