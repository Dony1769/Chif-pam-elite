BEGIN;

REVOKE ALL ON FUNCTION public.sync_profile_email_verification() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_profile_email_verification() TO postgres, service_role;

COMMIT;