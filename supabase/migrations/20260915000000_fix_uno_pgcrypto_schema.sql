BEGIN;

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
    v_code := upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 6));
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

REVOKE ALL ON FUNCTION public.uno_create_room(bigint, smallint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.uno_create_room(bigint, smallint) TO authenticated;

COMMIT;