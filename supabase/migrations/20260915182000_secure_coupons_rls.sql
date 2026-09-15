BEGIN;

REVOKE ALL ON public.coupons FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.coupons FROM authenticated;
GRANT SELECT ON public.coupons TO authenticated;

DROP POLICY IF EXISTS coupons_admin_all ON public.coupons;
CREATE POLICY coupons_admin_all
  ON public.coupons
  FOR ALL
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

DROP POLICY IF EXISTS coupons_select_active ON public.coupons;
CREATE POLICY coupons_select_active
  ON public.coupons
  FOR SELECT
  TO authenticated
  USING (is_active = true);

COMMIT;