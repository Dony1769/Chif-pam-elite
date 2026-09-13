-- Public consultation is allowed only for explicitly selected catalog tables.
-- All writes remain authenticated and user-scoped where a user_id column exists.

DO $$
DECLARE
  table_record record;
  policy_record record;
BEGIN
  FOR table_record IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_record.table_name);

  END LOOP;
END $$;

DO $$
DECLARE
  table_record record;
BEGIN
  FOR table_record IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'user_id' AND NOT a.attisdropped
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'public_user_select_own', table_record.table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'public_user_insert_own', table_record.table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'public_user_update_own', table_record.table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'public_user_delete_own', table_record.table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id)', 'public_user_select_own', table_record.table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)', 'public_user_insert_own', table_record.table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', 'public_user_update_own', table_record.table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (auth.uid() = user_id)', 'public_user_delete_own', table_record.table_name);
  END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS public_profile_select_own ON public.profiles;
DROP POLICY IF EXISTS public_profile_update_own ON public.profiles;
CREATE POLICY public_profile_select_own ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY public_profile_update_own ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['tirages', 'challenges', 'game_settings', 'boutique_packs', 'level_perks']
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'public_consultation', table_name);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)', 'public_consultation', table_name);
    END IF;
  END LOOP;
END $$;