BEGIN;

CREATE OR REPLACE FUNCTION public.admin_set_agent_status(p_user_id uuid, p_status text, p_reputation_level integer DEFAULT NULL)
RETURNS public.agent_profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin_role text; v_profile_role text; v_agent public.agent_profiles;
BEGIN
  SELECT role INTO v_admin_role FROM public.profiles WHERE id = auth.uid();
  IF v_admin_role <> 'admin' THEN RAISE EXCEPTION 'Acces admin requis'; END IF;
  IF p_status NOT IN ('active', 'suspended') THEN RAISE EXCEPTION 'Statut invalide'; END IF;
  SELECT role INTO v_profile_role FROM public.profiles WHERE id = p_user_id;
  IF v_profile_role <> 'agent' AND NOT EXISTS (SELECT 1 FROM public.agent_profiles WHERE user_id = p_user_id AND is_system_fallback) THEN
    RAISE EXCEPTION 'Le compte doit etre approuve comme agent via une demande';
  END IF;
  UPDATE public.agent_profiles SET status = p_status, reputation_level = coalesce(p_reputation_level, reputation_level), updated_at = now() WHERE user_id = p_user_id RETURNING * INTO v_agent;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil agent introuvable'; END IF;
  RETURN v_agent;
END;
$$;

COMMIT;