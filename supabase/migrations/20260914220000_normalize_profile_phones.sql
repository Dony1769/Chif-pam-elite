BEGIN;

CREATE TABLE IF NOT EXISTS public.phone_normalization_duplicates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone_original text NOT NULL,
  normalized_phone text NOT NULL,
  created_at timestamptz NOT NULL,
  role text,
  jetons_cp bigint,
  balance numeric,
  reviewed boolean NOT NULL DEFAULT false,
  reviewed_at timestamptz,
  review_note text,
  UNIQUE (profile_id),
  UNIQUE (normalized_phone, profile_id)
);

WITH candidates AS (
  SELECT
    id,
    phone,
    created_at,
    role,
    jetons_cp,
    balance,
    regexp_replace(phone, '[^0-9]', '', 'g') AS digits
  FROM public.profiles
), normalized AS (
  SELECT *,
    CASE
      WHEN length(digits) = 8 THEN '+509' || digits
      WHEN length(digits) = 11 AND left(digits, 3) = '509' THEN '+' || digits
      ELSE NULL
    END AS normalized_phone
  FROM candidates
), conflicts AS (
  SELECT normalized_phone
  FROM normalized
  WHERE normalized_phone IS NOT NULL
  GROUP BY normalized_phone
  HAVING count(*) > 1
)
INSERT INTO public.phone_normalization_duplicates (
  profile_id, phone_original, normalized_phone, created_at, role, jetons_cp, balance
)
SELECT n.id, n.phone, n.normalized_phone, n.created_at, n.role, n.jetons_cp, n.balance
FROM normalized n
JOIN conflicts c ON c.normalized_phone = n.normalized_phone
ON CONFLICT (profile_id) DO UPDATE SET
  phone_original = EXCLUDED.phone_original,
  normalized_phone = EXCLUDED.normalized_phone,
  created_at = EXCLUDED.created_at,
  role = EXCLUDED.role,
  jetons_cp = EXCLUDED.jetons_cp,
  balance = EXCLUDED.balance;

WITH normalized AS (
  SELECT
    id,
    CASE
      WHEN length(regexp_replace(phone, '[^0-9]', '', 'g')) = 8
        THEN '+509' || regexp_replace(phone, '[^0-9]', '', 'g')
      WHEN length(regexp_replace(phone, '[^0-9]', '', 'g')) = 11
        AND left(regexp_replace(phone, '[^0-9]', '', 'g'), 3) = '509'
        THEN '+' || regexp_replace(phone, '[^0-9]', '', 'g')
      ELSE NULL
    END AS normalized_phone
  FROM public.profiles
), unique_candidates AS (
  SELECT n.id, n.normalized_phone
  FROM normalized n
  WHERE n.normalized_phone IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.phone_normalization_duplicates d WHERE d.profile_id = n.id
    )
)
UPDATE public.profiles p
SET phone = u.normalized_phone
FROM unique_candidates u
WHERE p.id = u.id AND p.phone IS DISTINCT FROM u.normalized_phone;

ALTER TABLE public.phone_normalization_duplicates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS phone_duplicates_admin_select ON public.phone_normalization_duplicates;
CREATE POLICY phone_duplicates_admin_select ON public.phone_normalization_duplicates
  FOR SELECT TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS phone_duplicates_admin_update ON public.phone_normalization_duplicates;
CREATE POLICY phone_duplicates_admin_update ON public.phone_normalization_duplicates
  FOR UPDATE TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

COMMIT;