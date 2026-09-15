BEGIN;

REVOKE ALL ON public.config_economie FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.config_economie TO authenticated;

DROP POLICY IF EXISTS config_economie_admin_all ON public.config_economie;
CREATE POLICY config_economie_admin_all
  ON public.config_economie
  FOR ALL
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

COMMIT;