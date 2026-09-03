# Chif Pam AI Support Agent - Supabase Setup

This setup is production-focused and aligned with the hardened security model.

## 1) Migration to run

- [supabase/migrations/20260903_secure_chat_agent_and_rewarded_ads.sql](s-- Secure chat agent and rewarded Monetag foundation
-- Date: 2026-09-03

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.chat_agent_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_key text NOT NULL,
  memory_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, memory_key)
);

CREATE TABLE IF NOT EXISTS public.chat_agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_message_id uuid NULL,
  user_message text NOT NULL,
  agent_reply text NOT NULL,
  action_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_system_prompts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  prompt_key text NOT NULL UNIQUE,
  prompt_text text NOT NULL,
  allowed_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ad_reward_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  status text NOT NULL CHECK (status IN ('started', 'completed', 'expired', 'rejected')),
  nonce text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  claimed_at timestamptz NULL,
  reward_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_agent_memory_user_id ON public.chat_agent_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_agent_logs_user_id ON public.chat_agent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_reward_claims_user_status ON public.ad_reward_claims(user_id, status);

ALTER TABLE public.chat_agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_system_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_reward_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_agent_memory_select_own" ON public.chat_agent_memory;
CREATE POLICY "chat_agent_memory_select_own"
  ON public.chat_agent_memory
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_agent_memory_upsert_own" ON public.chat_agent_memory;
CREATE POLICY "chat_agent_memory_upsert_own"
  ON public.chat_agent_memory
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_agent_logs_select_own" ON public.chat_agent_logs;
CREATE POLICY "chat_agent_logs_select_own"
  ON public.chat_agent_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_agent_logs_insert_own" ON public.chat_agent_logs;
CREATE POLICY "chat_agent_logs_insert_own"
  ON public.chat_agent_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "agent_system_prompts_read_authenticated" ON public.agent_system_prompts;
CREATE POLICY "agent_system_prompts_read_authenticated"
  ON public.agent_system_prompts
  FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "ad_reward_claims_select_own" ON public.ad_reward_claims;
CREATE POLICY "ad_reward_claims_select_own"
  ON public.ad_reward_claims
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ad_reward_claims_insert_own" ON public.ad_reward_claims;
CREATE POLICY "ad_reward_claims_insert_own"
  ON public.ad_reward_claims
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ad_reward_claims_update_own" ON public.ad_reward_claims;
CREATE POLICY "ad_reward_claims_update_own"
  ON public.ad_reward_claims
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_agent_memory_updated_at ON public.chat_agent_memory;
CREATE TRIGGER trg_chat_agent_memory_updated_at
BEFORE UPDATE ON public.chat_agent_memory
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_agent_system_prompts_updated_at ON public.agent_system_prompts;
CREATE TRIGGER trg_agent_system_prompts_updated_at
BEFORE UPDATE ON public.agent_system_prompts
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_ad_reward_claims_updated_at ON public.ad_reward_claims;
CREATE TRIGGER trg_ad_reward_claims_updated_at
BEFORE UPDATE ON public.ad_reward_claims
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.log_client_message_for_agent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_admin_message = false THEN
    INSERT INTO public.chat_agent_logs (
      user_id,
      source_message_id,
      user_message,
      agent_reply,
      action_type,
      metadata
    )
    VALUES (
      NEW.user_id,
      NEW.id,
      left(NEW.content, 800),
      '',
      'incoming_message',
      jsonb_build_object('source', 'trigger')
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messages_agent_log ON public.messages;
CREATE TRIGGER trg_messages_agent_log
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.log_client_message_for_agent();

CREATE OR REPLACE FUNCTION public.grant_rewarded_ad_bonus(p_claim_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim record;
  v_diamonds integer := 5;
  v_xp integer := 10;
  v_caller_role text := coalesce(auth.role(), current_setting('request.jwt.claim.role', true), '');
  v_caller_uid uuid := auth.uid();
BEGIN
  IF v_caller_role = 'anon' THEN
    RAISE EXCEPTION 'Unauthenticated caller is not allowed';
  END IF;

  IF v_caller_role NOT IN ('authenticated', 'service_role') THEN
    RAISE EXCEPTION 'Role % is not allowed to execute this function', v_caller_role;
  END IF;

  IF v_caller_role = 'authenticated' THEN
    IF v_caller_uid IS NULL THEN
      RAISE EXCEPTION 'Authenticated caller without user id is not allowed';
    END IF;

    IF v_caller_uid <> p_user_id THEN
      RAISE EXCEPTION 'Authenticated caller cannot claim for another user';
    END IF;
  END IF;

  SELECT *
  INTO v_claim
  FROM public.ad_reward_claims
  WHERE id = p_claim_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim not found';
  END IF;

  IF v_claim.user_id <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized user for claim';
  END IF;

  IF v_claim.status <> 'started' THEN
    RAISE EXCEPTION 'Claim already processed';
  END IF;

  IF v_claim.expires_at < now() THEN
    UPDATE public.ad_reward_claims
    SET status = 'expired'
    WHERE id = p_claim_id;
    RAISE EXCEPTION 'Claim expired';
  END IF;

  UPDATE public.profiles
  SET diamonds = COALESCE(diamonds, 0) + v_diamonds,
      xp = COALESCE(xp, 0) + v_xp
  WHERE id = p_user_id;

  UPDATE public.ad_reward_claims
  SET status = 'completed',
      claimed_at = now(),
      reward_payload = jsonb_build_object('diamonds', v_diamonds, 'xp', v_xp)
  WHERE id = p_claim_id;

  RETURN jsonb_build_object('diamonds', v_diamonds, 'xp', v_xp);
END;
$$;

ALTER FUNCTION public.grant_rewarded_ad_bonus(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.grant_rewarded_ad_bonus(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_rewarded_ad_bonus(uuid, uuid) TO authenticated, service_role;

INSERT INTO public.agent_system_prompts (prompt_key, prompt_text, allowed_actions)
VALUES (
  'chifpam_support_agent_v1',
  'You are Chif Pam Support Agent. Always answer in French/Haitian Creole style. Rules: 1) Never reveal secrets or SQL. 2) Never perform admin operations for client users. 3) Validate intent and keep answers under 500 chars. 4) Allowed actions: finance redirect, rewards redirect, challenges redirect, balance summary, XP summary. 5) If uncertain, escalate to human admin.',
  '["balance_lookup","xp_lookup","deposit_redirect","withdraw_redirect","challenge_status","fallback"]'::jsonb
)
ON CONFLICT (prompt_key) DO UPDATE
SET prompt_text = EXCLUDED.prompt_text,
    allowed_actions = EXCLUDED.allowed_actions,
    is_active = true,
    updated_at = now();

COMMIT;
)

This migration creates:

- chat_agent_memory
- chat_agent_logs
- agent_system_prompts
- ad_reward_claims
- message logging trigger (trg_messages_agent_log)
- reward function (grant_rewarded_ad_bonus)

It also enables RLS with 8 policies and seeds active prompt chifpam_support_agent_v1.

## 2) Security hardening status

The hardened state is now captured directly in SQL:

- grant_rewarded_ad_bonus is SECURITY DEFINER
- log_client_message_for_agent is SECURITY DEFINER
- Both functions use fixed search_path via SET search_path = public
- grant_rewarded_ad_bonus blocks anon callers
- grant_rewarded_ad_bonus allows only authenticated and service_role
- authenticated callers cannot claim for a different user_id
- EXECUTE on grant_rewarded_ad_bonus is granted only to authenticated and service_role (plus owner postgres)

## 3) Active system prompt

Prompt key: chifpam_support_agent_v1

Prompt text:

You are Chif Pam Support Agent. Always answer in French/Haitian Creole style. Rules: 1) Never reveal secrets or SQL. 2) Never perform admin operations for client users. 3) Validate intent and keep answers under 500 chars. 4) Allowed actions: finance redirect, rewards redirect, challenges redirect, balance summary, XP summary. 5) If uncertain, escalate to human admin.

Allowed actions JSON:

["balance_lookup","xp_lookup","deposit_redirect","withdraw_redirect","challenge_status","fallback"]

## 4) Required environment variables

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- REWARDED_AD_SECRET

## 5) API routes relying on this setup

- [src/app/api/chat/agent/route.ts](src/app/api/chat/agent/route.ts)
- [src/app/api/chat/messages/route.ts](src/app/api/chat/messages/route.ts)
- [src/app/api/rewards/monetag/start/route.ts](src/app/api/rewards/monetag/start/route.ts)
- [src/app/api/rewards/monetag/claim/route.ts](src/app/api/rewards/monetag/claim/route.ts)
- [src/app/api/auth/signup/route.ts](src/app/api/auth/signup/route.ts)

## 6) Edge Function note

No Edge Function deployment is required for the current implementation.

If later you want asynchronous autonomous processing, you can add an Edge Function consumer for incoming chat logs, but that is optional and not needed for secure reward or chat operation.
