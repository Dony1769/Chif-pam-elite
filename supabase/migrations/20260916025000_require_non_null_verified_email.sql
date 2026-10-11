BEGIN;

UPDATE public.profiles p
SET email_verified = (
  u.email IS NOT NULL
  AND u.email_confirmed_at IS NOT NULL
  AND NOT public.is_generated_profile_email(u.email, p.phone)
)
FROM auth.users u
WHERE u.id = p.id;

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
          NEW.email IS NOT NULL
          AND NEW.email_confirmed_at IS NOT NULL
          AND NOT public.is_generated_profile_email(NEW.email, phone)
        )
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_profile_email_verification() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_profile_email_verification() TO postgres, service_role;

COMMIT;