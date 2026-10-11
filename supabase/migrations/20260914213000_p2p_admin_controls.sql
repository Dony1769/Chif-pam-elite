BEGIN;

CREATE OR REPLACE FUNCTION public.p2p_refresh_agent_metrics(p_agent_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_clients integer; v_recent_count integer; v_recent_clients integer; v_new_clients integer;
BEGIN
  SELECT count(DISTINCT buyer_id) INTO v_clients FROM public.p2p_transactions WHERE agent_id = p_agent_id AND status = 'completed';
  UPDATE public.agent_profiles SET successful_clients_count = v_clients, reputation_level = floor(v_clients / 10)::integer, updated_at = now() WHERE user_id = p_agent_id;
  SELECT count(*), count(DISTINCT buyer_id) INTO v_recent_count, v_recent_clients FROM public.p2p_transactions WHERE agent_id = p_agent_id AND status = 'completed' AND created_at > now() - interval '24 hours';
  SELECT count(*) INTO v_new_clients FROM public.p2p_transactions t JOIN public.profiles p ON p.id = t.buyer_id WHERE t.agent_id = p_agent_id AND t.status = 'completed' AND t.created_at > now() - interval '7 days' AND p.created_at > now() - interval '30 days';
  IF v_recent_count >= 20 AND v_recent_clients <= 3 AND NOT EXISTS (SELECT 1 FROM public.p2p_fraud_flags WHERE agent_id = p_agent_id AND pattern = 'concentrated_volume' AND created_at > now() - interval '24 hours') THEN
    INSERT INTO public.p2p_fraud_flags(agent_id, pattern, metadata) VALUES (p_agent_id, 'concentrated_volume', jsonb_build_object('transactions_24h', v_recent_count, 'clients_24h', v_recent_clients));
  END IF;
  IF v_new_clients >= 5 AND NOT EXISTS (SELECT 1 FROM public.p2p_fraud_flags WHERE agent_id = p_agent_id AND pattern = 'recent_clients_cluster' AND created_at > now() - interval '24 hours') THEN
    INSERT INTO public.p2p_fraud_flags(agent_id, pattern, metadata) VALUES (p_agent_id, 'recent_clients_cluster', jsonb_build_object('recent_clients_7d', v_new_clients));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_agent_status(p_user_id uuid, p_status text, p_reputation_level integer DEFAULT NULL)
RETURNS public.agent_profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text; v_agent public.agent_profiles;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role <> 'admin' THEN RAISE EXCEPTION 'Acces admin requis'; END IF;
  IF p_status NOT IN ('active', 'suspended') THEN RAISE EXCEPTION 'Statut invalide'; END IF;
  UPDATE public.profiles SET role = CASE WHEN p_status = 'active' THEN 'agent' ELSE 'agent' END WHERE id = p_user_id;
  INSERT INTO public.agent_profiles(user_id, status, reputation_level)
  VALUES (p_user_id, p_status, greatest(coalesce(p_reputation_level, 0), 0))
  ON CONFLICT (user_id) DO UPDATE SET status = EXCLUDED.status, reputation_level = coalesce(p_reputation_level, agent_profiles.reputation_level), updated_at = now()
  RETURNING * INTO v_agent;
  RETURN v_agent;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_agent_reputation(p_user_id uuid, p_reputation_level integer)
RETURNS public.agent_profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text; v_agent public.agent_profiles;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role <> 'admin' OR p_reputation_level < 0 THEN RAISE EXCEPTION 'Modification non autorisee'; END IF;
  UPDATE public.agent_profiles SET reputation_level = p_reputation_level, updated_at = now() WHERE user_id = p_user_id RETURNING * INTO v_agent;
  IF NOT FOUND THEN RAISE EXCEPTION 'Agent introuvable'; END IF;
  RETURN v_agent;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_agent_status(uuid, text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_agent_reputation(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_agent_status(uuid, text, integer), public.admin_set_agent_reputation(uuid, integer) TO authenticated;

COMMIT;