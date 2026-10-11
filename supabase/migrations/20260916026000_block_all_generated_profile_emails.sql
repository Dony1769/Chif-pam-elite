BEGIN;

UPDATE public.profiles
SET email_verified = false
WHERE public.is_generated_profile_email(email, phone);

COMMIT;