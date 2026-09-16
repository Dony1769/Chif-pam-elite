BEGIN;

CREATE OR REPLACE FUNCTION public.uno_leave_room(p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_room public.rooms;
  v_player public.room_players;
  v_other public.room_players;
  v_player_count integer;
  v_standings jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Salle introuvable';
  END IF;

  SELECT * INTO v_player
  FROM public.room_players
  WHERE room_id = p_room_id AND user_id = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vous ne faites pas partie de cette salle';
  END IF;

  IF v_room.status = 'waiting' THEN
    IF v_room.host_id = v_user_id THEN
      FOR v_other IN SELECT * FROM public.room_players WHERE room_id = p_room_id FOR UPDATE LOOP
        UPDATE public.profiles
        SET jetons_cp = coalesce(jetons_cp, 0) + v_other.bet_cp
        WHERE id = v_other.user_id;
        INSERT INTO public.jetons_transactions(user_id, type, montant_cp, details)
        VALUES (v_other.user_id, 'uno_refund', v_other.bet_cp, 'Remboursement UNO - abandon de l''hote ' || v_room.match_code);
      END LOOP;

      DELETE FROM public.room_players WHERE room_id = p_room_id;
      UPDATE public.rooms
      SET status = 'cancelled', pot_cp = 0, finished_at = now()
      WHERE id = p_room_id;
      RETURN jsonb_build_object('success', true, 'message', 'La salle a été fermée et toutes les mises ont été remboursées.');
    END IF;

    UPDATE public.profiles
    SET jetons_cp = coalesce(jetons_cp, 0) + v_player.bet_cp
    WHERE id = v_user_id;
    INSERT INTO public.jetons_transactions(user_id, type, montant_cp, details)
    VALUES (v_user_id, 'uno_refund', v_player.bet_cp, 'Remboursement UNO - départ de la salle ' || v_room.match_code);
    DELETE FROM public.room_players WHERE room_id = p_room_id AND user_id = v_user_id;
    UPDATE public.rooms
    SET pot_cp = greatest(0, pot_cp - v_player.bet_cp)
    WHERE id = p_room_id AND status = 'waiting';
    RETURN jsonb_build_object('success', true, 'message', 'Vous avez quitté la salle et votre mise a été intégralement remboursée.');
  END IF;

  IF v_room.status = 'playing' THEN
    SELECT count(*) INTO v_player_count FROM public.room_players WHERE room_id = p_room_id;

    IF v_player_count = 2 THEN
      SELECT * INTO v_other
      FROM public.room_players
      WHERE room_id = p_room_id AND user_id <> v_user_id
      FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Adversaire introuvable';
      END IF;

      SELECT coalesce(jsonb_agg(jsonb_build_object('user_id', rp.user_id, 'username', p.username, 'score', 0) ORDER BY rp.seat), '[]'::jsonb)
      INTO v_standings
      FROM public.room_players rp
      LEFT JOIN public.profiles p ON p.id = rp.user_id
      WHERE rp.room_id = p_room_id;

      UPDATE public.profiles
      SET jetons_cp = coalesce(jetons_cp, 0) + v_room.pot_cp
      WHERE id = v_other.user_id;
      INSERT INTO public.jetons_transactions(user_id, type, montant_cp, details)
      VALUES (v_other.user_id, 'uno_win', v_room.pot_cp, 'Victoire UNO par forfait ' || v_room.match_code);
      INSERT INTO public.matches(room_id, winner_id, pot_cp, vip_bonus_cp, final_standings, players_snapshot)
      SELECT p_room_id, v_other.user_id, v_room.pot_cp, 0, v_standings,
        coalesce(jsonb_agg(jsonb_build_object('user_id', user_id, 'bet_cp', bet_cp)), '[]'::jsonb)
      FROM public.room_players
      WHERE room_id = p_room_id;
      UPDATE public.rooms
      SET status = 'finished', winner_id = v_other.user_id, pot_cp = 0, finished_at = now(), current_turn = NULL
      WHERE id = p_room_id;
      RETURN jsonb_build_object('success', true, 'message', 'Vous avez abandonné. Votre adversaire remporte la partie par forfait.');
    END IF;

    FOR v_other IN SELECT * FROM public.room_players WHERE room_id = p_room_id FOR UPDATE LOOP
      UPDATE public.profiles
      SET jetons_cp = coalesce(jetons_cp, 0) + v_other.bet_cp
      WHERE id = v_other.user_id;
      INSERT INTO public.jetons_transactions(user_id, type, montant_cp, details)
      VALUES (v_other.user_id, 'uno_refund', v_other.bet_cp, 'Remboursement UNO - abandon multi-joueur ' || v_room.match_code);
    END LOOP;
    UPDATE public.rooms
    SET status = 'cancelled', pot_cp = 0, finished_at = now(), current_turn = NULL
    WHERE id = p_room_id;
    RETURN jsonb_build_object('success', true, 'message', 'La partie a été annulée et toutes les mises ont été intégralement remboursées.');
  END IF;

  RAISE EXCEPTION 'La salle n''est plus active';
END;
$$;

CREATE OR REPLACE FUNCTION public.uno_cancel_expired_room(p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_room public.rooms;
  v_player record;
BEGIN
  IF v_user_id IS NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Salle introuvable';
  END IF;
  IF v_room.status <> 'waiting' THEN
    RAISE EXCEPTION 'La salle n''est plus en attente';
  END IF;
  IF auth.role() <> 'service_role' AND NOT EXISTS (
    SELECT 1 FROM public.room_players WHERE room_id = p_room_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Accès réservé aux participants';
  END IF;
  IF v_room.expires_at IS NULL OR v_room.expires_at > now() THEN
    RAISE EXCEPTION 'Le délai d''attente n''est pas encore dépassé';
  END IF;

  FOR v_player IN SELECT user_id, bet_cp FROM public.room_players WHERE room_id = p_room_id FOR UPDATE LOOP
    UPDATE public.profiles
    SET jetons_cp = coalesce(jetons_cp, 0) + v_player.bet_cp
    WHERE id = v_player.user_id;
    INSERT INTO public.jetons_transactions(user_id, type, montant_cp, details)
    VALUES (v_player.user_id, 'uno_refund', v_player.bet_cp, 'Remboursement UNO - expiration ' || v_room.match_code);
  END LOOP;

  UPDATE public.rooms
  SET status = 'cancelled', pot_cp = 0, finished_at = now()
  WHERE id = p_room_id AND status = 'waiting';
  RETURN jsonb_build_object('success', true, 'message', 'Salle expirée et annulée. Toutes les mises ont été remboursées.');
END;
$$;

REVOKE ALL ON FUNCTION public.uno_leave_room(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.uno_leave_room(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.uno_cancel_expired_room(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.uno_cancel_expired_room(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.uno_create_room(bigint, smallint) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.uno_join_room(text, bigint) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.uno_start_match(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.uno_play_card(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.uno_draw_card(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.uno_get_player_profiles(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.uno_create_room(bigint, smallint), public.uno_join_room(text, bigint), public.uno_start_match(uuid), public.uno_play_card(uuid, text, text), public.uno_draw_card(uuid), public.uno_get_player_profiles(uuid) TO authenticated;

COMMIT;