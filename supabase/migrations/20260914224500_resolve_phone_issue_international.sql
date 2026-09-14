BEGIN;

CREATE OR REPLACE FUNCTION public.resolve_phone_issue_after_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.phone ~ '^\\+[0-9]{11,15}$' THEN
    UPDATE public.phone_account_issues
    SET resolved = true, resolved_at = now()
    WHERE profile_id = NEW.id AND issue_type = 'invalid_phone' AND NOT resolved;
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;