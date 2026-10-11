BEGIN;

ALTER TABLE public.phone_merge_review_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS phone_merge_review_log_admin_all ON public.phone_merge_review_log;
CREATE POLICY phone_merge_review_log_admin_all
  ON public.phone_merge_review_log
  FOR ALL
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

COMMIT;