BEGIN;

DROP INDEX IF EXISTS public.idx_messages_user_created;
DROP INDEX IF EXISTS public.idx_notifications_user_created;
DROP INDEX IF EXISTS public.idx_profiles_created;
DROP INDEX IF EXISTS public.idx_profiles_id_phone;

COMMIT;