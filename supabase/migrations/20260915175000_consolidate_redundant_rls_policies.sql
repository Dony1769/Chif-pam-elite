BEGIN;

DROP POLICY IF EXISTS "Les utilisateurs peuvent lire leurs messages" ON public.messages;
DROP POLICY IF EXISTS public_user_select_own ON public.messages;

DROP POLICY IF EXISTS public_user_select_own ON public.notifications;
DROP POLICY IF EXISTS public_user_delete_own ON public.notifications;
DROP POLICY IF EXISTS public_user_insert_own ON public.notifications;

DROP POLICY IF EXISTS public_profile_select_own ON public.profiles;
DROP POLICY IF EXISTS public_profile_update_own ON public.profiles;
DROP POLICY IF EXISTS public_user_update_own ON public.profiles;

COMMIT;