BEGIN;

CREATE TABLE IF NOT EXISTS public.phone_account_issues (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  issue_type text NOT NULL CHECK (issue_type IN ('invalid_phone', 'unresolved_duplicate')),
  normalized_phone text,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.phone_merge_review_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kept_profile_id uuid NOT NULL REFERENCES public.profiles(id),
  candidate_profile_id uuid NOT NULL REFERENCES public.profiles(id),
  normalized_phone text NOT NULL,
  action text NOT NULL CHECK (action IN ('blocked_related_data', 'merged')),
  related_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.phone_merge_review_log (kept_profile_id, candidate_profile_id, normalized_phone, action, related_data)
VALUES
  ('03f8f6b9-e0fc-40de-a9d9-fe8486269881', '270bc5be-8e73-42ec-b437-e6ccdfdcd7f9', '+50940404791', 'blocked_related_data', '{"notifications":4}'::jsonb),
  ('f63e53a4-353e-4497-9b0f-7f8b6654e0ec', 'b6041114-608e-41d0-87ed-9baf29171fa6', '+50947424857', 'blocked_related_data', '{"notifications":4}'::jsonb),
  ('9f8eb8e3-fc77-4358-bc43-88c1e732919f', '703f104f-083f-4161-931f-24de680b87ef', '+50955220092', 'blocked_related_data', '{"notifications":4}'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO public.phone_account_issues (profile_id, issue_type, normalized_phone)
VALUES
  ('88b44897-edd7-4e1c-9200-0e52391d4b0f', 'invalid_phone', NULL),
  ('ccc9ee61-f909-48cc-a2be-e32f277e032c', 'invalid_phone', NULL),
  ('278cb694-a5c9-4161-8e01-cc2d58ef4b37', 'invalid_phone', NULL),
  ('b7b82583-b893-48b6-ba4b-7f52b3e08471', 'invalid_phone', NULL),
  ('09b8e5eb-5194-40a9-864e-ad066a5bb78b', 'invalid_phone', NULL),
  ('269639ee-2f32-40ba-9f01-3ea1277636aa', 'unresolved_duplicate', '+50941989121'),
  ('3e014395-2f39-4a65-aa81-c979f8be0184', 'unresolved_duplicate', '+50941989121')
ON CONFLICT (profile_id) DO UPDATE SET issue_type = EXCLUDED.issue_type, normalized_phone = EXCLUDED.normalized_phone;

INSERT INTO public.notifications (user_id, title, content, type)
SELECT profile_id, 'Action requise : numéro de téléphone', 'Veuillez corriger votre numéro de téléphone dans les paramètres de votre profil.', 'phone_issue'
FROM public.phone_account_issues WHERE issue_type = 'invalid_phone'
  AND NOT EXISTS (SELECT 1 FROM public.notifications n WHERE n.user_id = profile_id AND n.type = 'phone_issue');

INSERT INTO public.notifications (user_id, title, content, type)
SELECT profile_id, 'Vérification de compte requise', 'Veuillez contacter le support afin de vérifier les informations de votre compte.', 'phone_issue'
FROM public.phone_account_issues WHERE issue_type = 'unresolved_duplicate'
  AND NOT EXISTS (SELECT 1 FROM public.notifications n WHERE n.user_id = profile_id AND n.type = 'phone_issue');

ALTER TABLE public.phone_account_issues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS phone_account_issues_select_own ON public.phone_account_issues;
CREATE POLICY phone_account_issues_select_own ON public.phone_account_issues FOR SELECT TO authenticated USING (profile_id = auth.uid());
DROP POLICY IF EXISTS phone_account_issues_admin_all ON public.phone_account_issues;
CREATE POLICY phone_account_issues_admin_all ON public.phone_account_issues FOR ALL TO authenticated USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin') WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE OR REPLACE FUNCTION public.resolve_phone_issue_after_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.phone ~ '^\\+509[0-9]{8}$' THEN
    UPDATE public.phone_account_issues SET resolved = true, resolved_at = now() WHERE profile_id = NEW.id AND issue_type = 'invalid_phone' AND NOT resolved;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_resolve_phone_issue ON public.profiles;
CREATE TRIGGER trg_resolve_phone_issue AFTER UPDATE OF phone ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.resolve_phone_issue_after_update();

COMMIT;