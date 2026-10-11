BEGIN;

CREATE OR REPLACE FUNCTION public.jouer_partie_cp(
  p_user_id uuid,
  p_mise_cp bigint,
  p_gain_cp bigint,
  p_jeu_nom text
)
RETURNS json
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_solde_actuel bigint;
  v_nouveau_solde bigint;
  v_xp_result jsonb;
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Utilisateur non autorisé');
  END IF;
  IF p_mise_cp IS NULL OR p_mise_cp < 0 OR p_gain_cp IS NULL OR p_gain_cp < 0 THEN
    RETURN json_build_object('success', false, 'message', 'Montant de jeu invalide');
  END IF;

  SELECT jetons_cp INTO v_solde_actuel FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF v_solde_actuel IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Profil introuvable');
  END IF;
  IF v_solde_actuel < p_mise_cp THEN
    RETURN json_build_object('success', false, 'message', 'Jetons CP insuffisants (Solde: ' || v_solde_actuel || ')');
  END IF;

  v_nouveau_solde := v_solde_actuel - p_mise_cp + p_gain_cp;
  UPDATE public.profiles SET jetons_cp = v_nouveau_solde WHERE id = p_user_id;

  IF p_mise_cp > 0 THEN
    INSERT INTO public.jetons_transactions (user_id, type, montant_cp, details)
    VALUES (p_user_id, 'DEBIT', p_mise_cp, 'Mise sur le jeu: ' || coalesce(p_jeu_nom, 'Jeu'));
  END IF;
  IF p_gain_cp > 0 THEN
    INSERT INTO public.jetons_transactions (user_id, type, montant_cp, details)
    VALUES (p_user_id, 'CREDIT', p_gain_cp, 'Gain sur le jeu: ' || coalesce(p_jeu_nom, 'Jeu'));
  END IF;

  v_xp_result := public.add_xp_with_multiplier(p_user_id, greatest(10, least(100, ceil(greatest(p_mise_cp, p_gain_cp)::numeric / 10)::integer)));

  RETURN json_build_object(
    'success', true,
    'nouveau_solde', v_nouveau_solde,
    'xp_result', v_xp_result,
    'message', 'Transaction validée'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', 'Erreur SQL: ' || SQLERRM);
END;
$$;

COMMIT;
