BEGIN;

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_actor_role text;
BEGIN
  SELECT role INTO v_actor_role FROM public.profiles WHERE id = auth.uid();
  IF auth.uid() IS NOT NULL AND v_actor_role <> 'admin' AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Le role est gere par l administration';
  END IF;
  IF OLD.role = 'agent' AND NEW.role <> 'agent' THEN
    RAISE EXCEPTION 'Un compte agent ne peut pas redevenir client';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

COMMIT;