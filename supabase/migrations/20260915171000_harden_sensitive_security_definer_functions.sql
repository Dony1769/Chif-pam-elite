BEGIN;

CREATE OR REPLACE FUNCTION public.increment_balance(user_id uuid, amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.profiles
  SET balance = balance + amount
  WHERE id = user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_balance(amount double precision, row_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM row_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.profiles
  SET balance = balance + amount
  WHERE id = row_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.initiate_withdrawal(user_id_param uuid, amount_param numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM user_id_param THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF (SELECT balance FROM public.profiles WHERE id = user_id_param) < amount_param THEN
    RAISE EXCEPTION 'Solde insuffisant';
  END IF;

  UPDATE public.profiles
  SET balance = balance - amount_param,
      locked_balance = locked_balance + amount_param
  WHERE id = user_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION public.place_bet_secure(
  p_user_id uuid,
  p_amount numeric,
  p_number text,
  p_tirage_id uuid,
  p_user_phone text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance numeric;
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT balance INTO current_balance
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF current_balance < p_amount THEN
    RAISE EXCEPTION 'Solde insuffisant';
  END IF;

  UPDATE public.profiles
  SET balance = balance - p_amount
  WHERE id = p_user_id;

  INSERT INTO public.bets (user_id, user_phone, number_played, stake, tirage_id, status)
  VALUES (p_user_id, p_user_phone, p_number, p_amount, p_tirage_id, 'en_attente');
END;
$$;

CREATE OR REPLACE FUNCTION public.process_game_bet(amount_to_deduct double precision, game_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_bal double precision;
  user_id_val uuid;
BEGIN
  user_id_val := auth.uid();
  IF user_id_val IS NULL THEN
    RAISE EXCEPTION 'Authenticated user required';
  END IF;

  SELECT balance INTO current_bal
  FROM public.profiles
  WHERE id = user_id_val
  FOR UPDATE;

  IF current_bal >= amount_to_deduct THEN
    UPDATE public.profiles
    SET balance = balance - amount_to_deduct
    WHERE id = user_id_val;

    INSERT INTO public.transactions (user_id, amount, type, description, status)
    VALUES (user_id_val, -amount_to_deduct, 'GAME_BET', 'Mise sur ' || game_name, 'completed');

    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.convertir_cp_en_htg(p_user_id uuid, p_montant_cp bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_taux numeric;
  v_gain_htg numeric;
  v_solde_cp bigint;
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT valeur::numeric INTO v_taux
  FROM public.config_economie
  WHERE cle = 'taux_retrait_cp_vers_htg';

  SELECT jetons_cp INTO v_solde_cp
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_solde_cp < p_montant_cp THEN
    RAISE EXCEPTION 'Solde CP insuffisant';
  END IF;

  v_gain_htg := p_montant_cp * v_taux;

  UPDATE public.profiles
  SET jetons_cp = jetons_cp - p_montant_cp,
      balance = balance + v_gain_htg
  WHERE id = p_user_id;

  INSERT INTO public.jetons_transactions (user_id, type, montant_cp, details)
  VALUES (p_user_id, 'conversion_htg', p_montant_cp, 'Conversion en ' || v_gain_htg || ' HTG');
END;
$$;

REVOKE ALL ON FUNCTION public.increment_balance(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_balance(uuid, numeric) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.increment_balance(double precision, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_balance(double precision, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.initiate_withdrawal(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.initiate_withdrawal(uuid, numeric) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.refund_withdrawal(uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_withdrawal(uuid, numeric) TO service_role;
REVOKE ALL ON FUNCTION public.place_bet_secure(uuid, numeric, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_bet_secure(uuid, numeric, text, uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.process_game_bet(double precision, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_game_bet(double precision, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.distribuer_gains(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.distribuer_gains(uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.distribuer_gains_automatique(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.distribuer_gains_automatique(uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.convertir_cp_en_htg(uuid, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convertir_cp_en_htg(uuid, bigint) TO authenticated, service_role;

COMMIT;