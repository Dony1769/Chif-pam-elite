BEGIN;

CREATE OR REPLACE FUNCTION public.subscribe_vip_plan(
  p_plan_id text,
  p_price integer,
  p_duration_days integer,
  p_plan_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_current_balance integer;
  v_current_expiry timestamptz;
  v_new_expiry timestamptz;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Utilisateur non authentifié.');
  END IF;

  SELECT balance, vip_expiry INTO v_current_balance, v_current_expiry
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_current_balance < p_price THEN
    RETURN json_build_object('success', false, 'message', 'Solde insuffisant pour souscrire à ce plan.');
  END IF;

  IF v_current_expiry IS NOT NULL AND v_current_expiry > now() THEN
    v_new_expiry := v_current_expiry + (p_duration_days || ' days')::interval;
  ELSE
    v_new_expiry := now() + (p_duration_days || ' days')::interval;
  END IF;

  UPDATE public.profiles
  SET balance = balance - p_price,
      vip_status = p_plan_id,
      vip_expiry = v_new_expiry
  WHERE id = v_user_id;

  INSERT INTO public.transactions (user_id, amount, type, description)
  VALUES (v_user_id, p_price, 'achat_pack', 'Activation plan VIP ' || p_plan_name);

  RETURN json_build_object('success', true, 'message', 'Abonnement VIP activé avec succès.');
END;
$$;

COMMIT;