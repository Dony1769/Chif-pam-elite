BEGIN;

ALTER TABLE public.p2p_offers
  ADD COLUMN IF NOT EXISTS payment_methods text[] NOT NULL DEFAULT ARRAY['MonCash', 'NatCash']::text[];

DROP FUNCTION IF EXISTS public.agent_upsert_offer(numeric, bigint, bigint, boolean);

CREATE OR REPLACE FUNCTION public.agent_upsert_offer(
  p_rate numeric,
  p_min_cp bigint,
  p_max_cp bigint,
  p_active boolean DEFAULT true,
  p_payment_methods text[] DEFAULT ARRAY['MonCash', 'NatCash']::text[]
)
RETURNS public.p2p_offers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_policy public.market_policy;
  v_agent public.agent_profiles;
  v_offer public.p2p_offers;
  v_payment_methods text[];
BEGIN
  SELECT * INTO v_agent FROM public.agent_profiles WHERE user_id = v_user FOR UPDATE;
  IF NOT FOUND OR v_agent.status <> 'active' THEN RAISE EXCEPTION 'Compte agent inactif'; END IF;
  SELECT * INTO v_policy FROM public.market_policy WHERE active;
  IF p_rate < v_policy.rate_min_htg_per_cp OR p_rate > v_policy.rate_max_htg_per_cp THEN RAISE EXCEPTION 'Taux hors fourchette autorisee'; END IF;
  IF p_min_cp <= 0 OR p_max_cp < p_min_cp OR p_max_cp > v_policy.max_transaction_cp THEN RAISE EXCEPTION 'Limites de transaction invalides'; END IF;

  SELECT coalesce(array_agg(method ORDER BY method), ARRAY[]::text[])
  INTO v_payment_methods
  FROM unnest(coalesce(p_payment_methods, ARRAY[]::text[])) AS method
  WHERE method IN ('MonCash', 'NatCash');
  IF coalesce(array_length(v_payment_methods, 1), 0) = 0 THEN RAISE EXCEPTION 'Methode de paiement invalide'; END IF;

  INSERT INTO public.p2p_offers(agent_id, rate_htg_per_cp, min_cp, max_cp, active, payment_methods, suspended_reason)
  VALUES (v_user, p_rate, p_min_cp, p_max_cp, p_active, v_payment_methods, NULL)
  ON CONFLICT (agent_id) DO UPDATE SET
    rate_htg_per_cp = EXCLUDED.rate_htg_per_cp,
    min_cp = EXCLUDED.min_cp,
    max_cp = EXCLUDED.max_cp,
    active = EXCLUDED.active,
    payment_methods = EXCLUDED.payment_methods,
    suspended_reason = NULL,
    updated_at = now()
  RETURNING * INTO v_offer;
  RETURN v_offer;
END;
$$;

GRANT EXECUTE ON FUNCTION public.agent_upsert_offer(numeric, bigint, bigint, boolean, text[]) TO authenticated;

COMMIT;
