BEGIN;

CREATE TABLE public.agent_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id),
  UNIQUE (user_id, status)
);

ALTER TABLE public.agent_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_requests_select_own ON public.agent_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY agent_requests_insert_client ON public.agent_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'client');
CREATE POLICY agent_requests_admin_all ON public.agent_requests FOR ALL TO authenticated USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin') WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE OR REPLACE FUNCTION public.submit_agent_request()
RETURNS public.agent_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_role text; v_request public.agent_requests;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = v_user FOR UPDATE;
  IF v_role <> 'client' THEN RAISE EXCEPTION 'Seuls les comptes client peuvent demander le statut agent'; END IF;
  IF EXISTS (SELECT 1 FROM public.agent_requests WHERE user_id = v_user AND status = 'pending') THEN RAISE EXCEPTION 'Une demande est deja en attente'; END IF;
  INSERT INTO public.agent_requests(user_id) VALUES (v_user) RETURNING * INTO v_request;
  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_agent_request(p_request_id uuid, p_decision text, p_note text DEFAULT NULL)
RETURNS public.agent_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := auth.uid(); v_role text; v_request public.agent_requests; v_profile public.profiles;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = v_admin;
  IF v_role <> 'admin' THEN RAISE EXCEPTION 'Acces admin requis'; END IF;
  IF p_decision NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'Decision invalide'; END IF;
  SELECT * INTO v_request FROM public.agent_requests WHERE id = p_request_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande introuvable ou deja traitee'; END IF;
  IF p_decision = 'approved' THEN
    UPDATE public.profiles SET role = 'agent', balance = 0, locked_balance = 0, jetons_cp = 0 WHERE id = v_request.user_id;
    INSERT INTO public.agent_profiles(user_id, status, reputation_level, successful_clients_count)
    VALUES (v_request.user_id, 'active', 0, 0)
    ON CONFLICT (user_id) DO UPDATE SET status = 'active', updated_at = now();
    INSERT INTO public.notifications(user_id, title, content, type)
    VALUES (v_request.user_id, 'Demande agent acceptee', 'Votre compte agent est actif. Vos soldes HTG et CP ont ete remis a zero.', 'agent_request');
  ELSE
    INSERT INTO public.notifications(user_id, title, content, type)
    VALUES (v_request.user_id, 'Demande agent refusee', coalesce(nullif(p_note, ''), 'Votre demande de statut agent n''a pas ete acceptee.'), 'agent_request');
  END IF;
  UPDATE public.agent_requests SET status = p_decision, admin_note = p_note, reviewed_at = now(), reviewed_by = v_admin WHERE id = p_request_id RETURNING * INTO v_request;
  RETURN v_request;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_agent_request() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_review_agent_request(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_agent_request(), public.admin_review_agent_request(uuid, text, text) TO authenticated;

COMMIT;