BEGIN;

CREATE OR REPLACE FUNCTION public.get_cp_to_htg_rate()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT valeur::numeric
  FROM public.config_economie
  WHERE cle = 'taux_retrait_cp_vers_htg';
$$;

REVOKE ALL ON FUNCTION public.get_cp_to_htg_rate() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cp_to_htg_rate() TO authenticated, service_role;

COMMIT;