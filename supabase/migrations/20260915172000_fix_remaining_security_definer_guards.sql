BEGIN;

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

COMMIT;