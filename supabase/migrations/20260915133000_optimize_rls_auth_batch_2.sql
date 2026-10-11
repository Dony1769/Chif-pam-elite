BEGIN;

DO $migration$
DECLARE
  policy_row record;
  roles_sql text;
  using_sql text;
  check_sql text;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename NOT IN (
        'messages', 'profiles', 'transactions', 'notifications',
        'mises', 'challenge_attempts'
      )
      AND (qual ~* 'auth\.[a-z_][a-z0-9_]*\(\)'
        OR with_check ~* 'auth\.[a-z_][a-z0-9_]*\(\)')
      AND NOT (qual ~* '\(\s*select\s+auth\.'
        OR with_check ~* '\(\s*select\s+auth\.')
  LOOP
    roles_sql := CASE
      WHEN policy_row.roles = ARRAY['public']::name[] THEN 'PUBLIC'
      ELSE (
        SELECT string_agg(quote_ident(role_name), ', ')
        FROM unnest(policy_row.roles) AS role_name
      )
    END;

    using_sql := CASE
      WHEN policy_row.qual IS NULL THEN ''
      ELSE format(
        ' USING (%s)',
        regexp_replace(
          policy_row.qual,
          '(^|[^[:alnum:]_])auth\.([a-z_][a-z0-9_]*)\(\)',
          '\1(SELECT auth.\2())',
          'gi'
        )
      )
    END;

    check_sql := CASE
      WHEN policy_row.with_check IS NULL THEN ''
      ELSE format(
        ' WITH CHECK (%s)',
        regexp_replace(
          policy_row.with_check,
          '(^|[^[:alnum:]_])auth\.([a-z_][a-z0-9_]*)\(\)',
          '\1(SELECT auth.\2())',
          'gi'
        )
      )
    END;

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      policy_row.policyname, policy_row.schemaname, policy_row.tablename
    );

    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename,
      policy_row.permissive,
      policy_row.cmd,
      roles_sql,
      using_sql,
      check_sql
    );
  END LOOP;
END;
$migration$;

COMMIT;