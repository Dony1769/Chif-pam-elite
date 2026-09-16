BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verification_last_sent_at timestamptz;

UPDATE public.profiles p
SET email_verified = NOT (
  lower(coalesce(p.email, '')) = regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') || '@chifpam.ht'
  OR lower(coalesce(p.email, '')) = regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') || '@gmail.com'
);

CREATE OR REPLACE FUNCTION public.sync_profile_email_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email OR NEW.email_confirmed_at IS DISTINCT FROM OLD.email_confirmed_at THEN
    UPDATE public.profiles
    SET email = NEW.email,
        email_verified = (
          NEW.email_confirmed_at IS NOT NULL
          AND lower(coalesce(NEW.email, '')) <> regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') || '@chifpam.ht'
          AND lower(coalesce(NEW.email, '')) <> regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') || '@gmail.com'
        )
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_verification ON auth.users;
CREATE TRIGGER on_auth_user_email_verification
  AFTER UPDATE OF email, email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_email_verification();

COMMIT;