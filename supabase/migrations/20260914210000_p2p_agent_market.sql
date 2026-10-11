BEGIN;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('client', 'admin', 'agent'));

CREATE TABLE public.agent_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  reputation_level integer NOT NULL DEFAULT 0 CHECK (reputation_level >= 0),
  successful_clients_count integer NOT NULL DEFAULT 0 CHECK (successful_clients_count >= 0),
  is_system_fallback boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX agent_profiles_one_fallback
  ON public.agent_profiles(is_system_fallback)
  WHERE is_system_fallback;

CREATE TABLE public.market_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_min_htg_per_cp numeric(12, 6) NOT NULL CHECK (rate_min_htg_per_cp > 0),
  rate_max_htg_per_cp numeric(12, 6) NOT NULL CHECK (rate_max_htg_per_cp >= rate_min_htg_per_cp),
  wholesale_price_htg_per_cp numeric(12, 6) NOT NULL CHECK (wholesale_price_htg_per_cp > 0),
  wholesale_floor_htg_per_cp numeric(12, 6) NOT NULL CHECK (wholesale_floor_htg_per_cp > 0),
  max_transaction_cp bigint NOT NULL DEFAULT 100000 CHECK (max_transaction_cp > 0),
  effective_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (wholesale_price_htg_per_cp >= wholesale_floor_htg_per_cp)
);

CREATE UNIQUE INDEX market_policy_one_active ON public.market_policy(active) WHERE active;

CREATE TABLE public.p2p_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rate_htg_per_cp numeric(12, 6) NOT NULL CHECK (rate_htg_per_cp > 0),
  min_cp bigint NOT NULL CHECK (min_cp > 0),
  max_cp bigint NOT NULL CHECK (max_cp >= min_cp),
  active boolean NOT NULL DEFAULT true,
  suspended_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id)
);

CREATE TABLE public.p2p_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.profiles(id),
  agent_id uuid NOT NULL REFERENCES public.profiles(id),
  direction text NOT NULL CHECK (direction IN ('buy_cp', 'sell_cp')),
  amount_cp bigint NOT NULL CHECK (amount_cp > 0),
  amount_htg numeric(14, 2) NOT NULL CHECK (amount_htg > 0),
  rate_htg_per_cp numeric(12, 6) NOT NULL CHECK (rate_htg_per_cp > 0),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.p2p_fraud_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  pattern text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.market_policy (rate_min_htg_per_cp, rate_max_htg_per_cp, wholesale_price_htg_per_cp, wholesale_floor_htg_per_cp)
VALUES (0.0125, 0.02, 0.01, 0.005)
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  v_admin uuid;
BEGIN
  SELECT id INTO v_admin FROM public.profiles WHERE role = 'admin' ORDER BY created_at LIMIT 1;
  IF v_admin IS NOT NULL THEN
    INSERT INTO public.agent_profiles(user_id, is_system_fallback)
    VALUES (v_admin, true)
    ON CONFLICT (user_id) DO UPDATE SET is_system_fallback = true, status = 'active';
    INSERT INTO public.p2p_offers(agent_id, rate_htg_per_cp, min_cp, max_cp, active)
    SELECT v_admin, rate_max_htg_per_cp, 1, max_transaction_cp, true
    FROM public.market_policy WHERE active
    ON CONFLICT (agent_id) DO UPDATE SET rate_htg_per_cp = EXCLUDED.rate_htg_per_cp, active = true;
  END IF;
END;
$$;

ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_fraud_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_profiles_select_market ON public.agent_profiles FOR SELECT TO authenticated USING (status = 'active' OR user_id = auth.uid());
CREATE POLICY agent_profiles_select_admin ON public.agent_profiles FOR SELECT TO authenticated USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY market_policy_select_authenticated ON public.market_policy FOR SELECT TO authenticated USING (active);
CREATE POLICY p2p_offers_select_active ON public.p2p_offers FOR SELECT TO authenticated USING (active);
CREATE POLICY p2p_offers_select_own ON public.p2p_offers FOR SELECT TO authenticated USING (agent_id = auth.uid());
CREATE POLICY p2p_transactions_select_participant ON public.p2p_transactions FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR agent_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY p2p_fraud_flags_admin_only ON public.p2p_fraud_flags FOR ALL TO authenticated USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin') WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE OR REPLACE FUNCTION public.p2p_current_policy()
RETURNS public.market_policy
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$ SELECT * FROM public.market_policy WHERE active LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.p2p_refresh_agent_metrics(p_agent_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.agent_profiles
  SET successful_clients_count = (SELECT count(DISTINCT buyer_id) FROM public.p2p_transactions WHERE agent_id = p_agent_id AND status = 'completed'),
      reputation_level = floor((SELECT count(DISTINCT buyer_id) FROM public.p2p_transactions WHERE agent_id = p_agent_id AND status = 'completed') / 10)::integer,
      updated_at = now()
  WHERE user_id = p_agent_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.agent_buy_wholesale(p_amount_cp bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_agent public.agent_profiles; v_policy public.market_policy; v_price numeric; v_cost numeric; v_balance numeric;
BEGIN
  SELECT * INTO v_agent FROM public.agent_profiles WHERE user_id = v_user FOR UPDATE;
  IF NOT FOUND OR v_agent.status <> 'active' THEN RAISE EXCEPTION 'Compte agent inactif'; END IF;
  IF p_amount_cp <= 0 THEN RAISE EXCEPTION 'Quantite CP invalide'; END IF;
  SELECT * INTO v_policy FROM public.market_policy WHERE active FOR UPDATE;
  v_price := greatest(v_policy.wholesale_floor_htg_per_cp, v_policy.wholesale_price_htg_per_cp - v_agent.reputation_level);
  v_cost := round(p_amount_cp * v_price, 2);
  SELECT balance INTO v_balance FROM public.profiles WHERE id = v_user FOR UPDATE;
  IF coalesce(v_balance, 0) < v_cost THEN RAISE EXCEPTION 'Solde gourdes insuffisant'; END IF;
  UPDATE public.profiles SET balance = balance - v_cost, jetons_cp = coalesce(jetons_cp, 0) + p_amount_cp WHERE id = v_user;
  RETURN jsonb_build_object('amount_cp', p_amount_cp, 'amount_htg', v_cost, 'unit_price', v_price);
END;
$$;

CREATE OR REPLACE FUNCTION public.agent_upsert_offer(p_rate numeric, p_min_cp bigint, p_max_cp bigint, p_active boolean DEFAULT true)
RETURNS public.p2p_offers LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_policy public.market_policy; v_agent public.agent_profiles; v_offer public.p2p_offers;
BEGIN
  SELECT * INTO v_agent FROM public.agent_profiles WHERE user_id = v_user FOR UPDATE;
  IF NOT FOUND OR v_agent.status <> 'active' THEN RAISE EXCEPTION 'Compte agent inactif'; END IF;
  SELECT * INTO v_policy FROM public.market_policy WHERE active;
  IF p_rate < v_policy.rate_min_htg_per_cp OR p_rate > v_policy.rate_max_htg_per_cp THEN RAISE EXCEPTION 'Taux hors fourchette autorisee'; END IF;
  IF p_min_cp <= 0 OR p_max_cp < p_min_cp OR p_max_cp > v_policy.max_transaction_cp THEN RAISE EXCEPTION 'Limites de transaction invalides'; END IF;
  INSERT INTO public.p2p_offers(agent_id, rate_htg_per_cp, min_cp, max_cp, active, suspended_reason)
  VALUES (v_user, p_rate, p_min_cp, p_max_cp, p_active, NULL)
  ON CONFLICT (agent_id) DO UPDATE SET rate_htg_per_cp = EXCLUDED.rate_htg_per_cp, min_cp = EXCLUDED.min_cp, max_cp = EXCLUDED.max_cp, active = EXCLUDED.active, suspended_reason = NULL, updated_at = now()
  RETURNING * INTO v_offer;
  RETURN v_offer;
END;
$$;

CREATE OR REPLACE FUNCTION public.p2p_buy_cp(p_offer_id uuid, p_amount_cp bigint)
RETURNS public.p2p_transactions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_buyer uuid := auth.uid(); v_offer public.p2p_offers; v_agent public.agent_profiles; v_policy public.market_policy; v_buyer_balance numeric; v_agent_cp bigint; v_cost numeric; v_tx public.p2p_transactions;
BEGIN
  SELECT * INTO v_policy FROM public.market_policy WHERE active FOR UPDATE;
  SELECT * INTO v_offer FROM public.p2p_offers WHERE id = p_offer_id FOR UPDATE;
  SELECT * INTO v_agent FROM public.agent_profiles WHERE user_id = v_offer.agent_id FOR UPDATE;
  IF NOT FOUND OR NOT v_offer.active OR v_agent.status <> 'active' THEN RAISE EXCEPTION 'Offre indisponible'; END IF;
  IF v_buyer = v_offer.agent_id THEN RAISE EXCEPTION 'Auto-transaction interdite'; END IF;
  IF p_amount_cp < v_offer.min_cp OR p_amount_cp > least(v_offer.max_cp, v_policy.max_transaction_cp) THEN RAISE EXCEPTION 'Quantite hors limites'; END IF;
  SELECT balance INTO v_buyer_balance FROM public.profiles WHERE id = v_buyer FOR UPDATE;
  SELECT jetons_cp INTO v_agent_cp FROM public.profiles WHERE id = v_offer.agent_id FOR UPDATE;
  v_cost := round(p_amount_cp * v_offer.rate_htg_per_cp, 2);
  IF coalesce(v_buyer_balance, 0) < v_cost THEN RAISE EXCEPTION 'Solde gourdes insuffisant'; END IF;
  IF coalesce(v_agent_cp, 0) < p_amount_cp THEN RAISE EXCEPTION 'Stock CP agent insuffisant'; END IF;
  UPDATE public.profiles SET balance = balance - v_cost, jetons_cp = coalesce(jetons_cp, 0) + p_amount_cp WHERE id = v_buyer;
  UPDATE public.profiles SET balance = balance + v_cost, jetons_cp = jetons_cp - p_amount_cp WHERE id = v_offer.agent_id;
  INSERT INTO public.p2p_transactions(buyer_id, agent_id, direction, amount_cp, amount_htg, rate_htg_per_cp)
  VALUES (v_buyer, v_offer.agent_id, 'buy_cp', p_amount_cp, v_cost, v_offer.rate_htg_per_cp) RETURNING * INTO v_tx;
  PERFORM public.p2p_refresh_agent_metrics(v_offer.agent_id);
  RETURN v_tx;
END;
$$;

CREATE OR REPLACE FUNCTION public.p2p_sell_cp(p_agent_id uuid, p_amount_cp bigint)
RETURNS public.p2p_transactions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_buyer uuid := auth.uid(); v_offer public.p2p_offers; v_agent public.agent_profiles; v_policy public.market_policy; v_buyer_cp bigint; v_agent_balance numeric; v_value numeric; v_tx public.p2p_transactions;
BEGIN
  SELECT * INTO v_policy FROM public.market_policy WHERE active FOR UPDATE;
  SELECT * INTO v_offer FROM public.p2p_offers WHERE agent_id = p_agent_id FOR UPDATE;
  SELECT * INTO v_agent FROM public.agent_profiles WHERE user_id = p_agent_id FOR UPDATE;
  IF NOT FOUND OR NOT v_offer.active OR v_agent.status <> 'active' THEN RAISE EXCEPTION 'Agent indisponible'; END IF;
  IF v_buyer = p_agent_id THEN RAISE EXCEPTION 'Auto-transaction interdite'; END IF;
  IF p_amount_cp < v_offer.min_cp OR p_amount_cp > least(v_offer.max_cp, v_policy.max_transaction_cp) THEN RAISE EXCEPTION 'Quantite hors limites'; END IF;
  SELECT jetons_cp INTO v_buyer_cp FROM public.profiles WHERE id = v_buyer FOR UPDATE;
  SELECT balance INTO v_agent_balance FROM public.profiles WHERE id = p_agent_id FOR UPDATE;
  v_value := round(p_amount_cp * v_offer.rate_htg_per_cp, 2);
  IF coalesce(v_buyer_cp, 0) < p_amount_cp THEN RAISE EXCEPTION 'Solde CP insuffisant'; END IF;
  IF coalesce(v_agent_balance, 0) < v_value THEN RAISE EXCEPTION 'Solde gourdes agent insuffisant'; END IF;
  UPDATE public.profiles SET jetons_cp = jetons_cp - p_amount_cp, balance = balance + v_value WHERE id = v_buyer;
  UPDATE public.profiles SET jetons_cp = coalesce(jetons_cp, 0) + p_amount_cp, balance = balance - v_value WHERE id = p_agent_id;
  INSERT INTO public.p2p_transactions(buyer_id, agent_id, direction, amount_cp, amount_htg, rate_htg_per_cp)
  VALUES (v_buyer, p_agent_id, 'sell_cp', p_amount_cp, v_value, v_offer.rate_htg_per_cp) RETURNING * INTO v_tx;
  PERFORM public.p2p_refresh_agent_metrics(p_agent_id);
  RETURN v_tx;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_market_policy(p_min numeric, p_max numeric, p_wholesale numeric, p_floor numeric, p_max_transaction bigint)
RETURNS public.market_policy LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_role text; v_policy public.market_policy;
BEGIN
  SELECT role INTO v_user_role FROM public.profiles WHERE id = auth.uid();
  IF v_user_role <> 'admin' THEN RAISE EXCEPTION 'Acces admin requis'; END IF;
  IF p_min <= 0 OR p_max < p_min OR p_floor <= 0 OR p_wholesale < p_floor THEN RAISE EXCEPTION 'Politique invalide'; END IF;
  UPDATE public.market_policy SET active = false WHERE active;
  INSERT INTO public.market_policy(rate_min_htg_per_cp, rate_max_htg_per_cp, wholesale_price_htg_per_cp, wholesale_floor_htg_per_cp, max_transaction_cp, created_by)
  VALUES (p_min, p_max, p_wholesale, p_floor, p_max_transaction, auth.uid()) RETURNING * INTO v_policy;
  UPDATE public.p2p_offers SET active = false, suspended_reason = 'Taux hors nouvelle fourchette', updated_at = now()
  WHERE active AND (rate_htg_per_cp < p_min OR rate_htg_per_cp > p_max);
  UPDATE public.p2p_offers SET max_cp = least(max_cp, p_max_transaction), updated_at = now() WHERE active;
  RETURN v_policy;
END;
$$;

REVOKE ALL ON FUNCTION public.p2p_current_policy() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.agent_buy_wholesale(bigint) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.agent_upsert_offer(numeric, bigint, bigint, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.p2p_buy_cp(uuid, bigint) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.p2p_sell_cp(uuid, bigint) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_market_policy(numeric, numeric, numeric, numeric, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.p2p_current_policy() TO authenticated;
GRANT EXECUTE ON FUNCTION public.agent_buy_wholesale(bigint), public.agent_upsert_offer(numeric, bigint, bigint, boolean), public.p2p_buy_cp(uuid, bigint), public.p2p_sell_cp(uuid, bigint), public.admin_update_market_policy(numeric, numeric, numeric, numeric, bigint) TO authenticated;

COMMIT;