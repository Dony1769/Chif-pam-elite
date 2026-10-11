BEGIN;

UPDATE public.profiles p
SET email_verified = false
FROM auth.users u
WHERE u.id = p.id
  AND lower(coalesce(u.email, '')) = regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') || '@chifpam.ht';

COMMIT;