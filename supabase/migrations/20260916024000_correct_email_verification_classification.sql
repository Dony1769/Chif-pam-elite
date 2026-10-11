BEGIN;

CREATE OR REPLACE FUNCTION public.is_generated_profile_email(candidate_email text, candidate_phone text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  email_local text;
  email_domain text;
  phone_digits text;
BEGIN
  IF candidate_email IS NULL OR btrim(candidate_email) = '' THEN
    RETURN true;
  END IF;

  email_local := lower(split_part(btrim(candidate_email), '@', 1));
  email_domain := lower(split_part(btrim(candidate_email), '@', 2));
  phone_digits := regexp_replace(coalesce(candidate_phone, ''), '[^0-9]', '', 'g');

  IF email_domain = 'chifpam.ht' AND email_local ~ '^[0-9]+$' THEN
    RETURN true;
  END IF;

  IF email_domain = 'gmail.com' AND email_local ~ '^[0-9]+$' THEN
    RETURN email_local = phone_digits
      OR (left(phone_digits, 3) = '509' AND email_local = substring(phone_digits from 4));
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.is_generated_profile_email(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_generated_profile_email(text, text) TO postgres, service_role;

UPDATE public.profiles p
SET email = u.email,
    email_verified = (
      u.email IS NOT NULL
      AND u.email_confirmed_at IS NOT NULL
      AND NOT public.is_generated_profile_email(u.email, p.phone)
    )
FROM auth.users u
WHERE u.id = p.id;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_unique
  ON public.profiles (lower(email))
  WHERE email IS NOT NULL AND btrim(email) <> '';

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