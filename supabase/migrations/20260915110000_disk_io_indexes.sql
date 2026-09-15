BEGIN;

-- User-scoped feeds and unread counters.
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread_user
  ON public.notifications (user_id)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_messages_user_created
  ON public.messages (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_unread_client
  ON public.messages (user_id)
  WHERE is_admin_message = true AND is_read_by_client = false;

CREATE INDEX IF NOT EXISTS idx_messages_unread_admin
  ON public.messages (user_id)
  WHERE is_admin_message = false AND is_read_by_admin = false;

CREATE INDEX IF NOT EXISTS idx_transactions_user_status_created
  ON public.transactions (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_pending_type_created
  ON public.transactions (status, type, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_mises_user_created
  ON public.mises (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mises_created
  ON public.mises (created_at DESC);

-- Active/expiring challenges are read and closed periodically.
CREATE INDEX IF NOT EXISTS idx_challenges_active_expiry
  ON public.challenges (ends_at)
  WHERE is_active = true AND ends_at IS NOT NULL;

-- Authentication, admin lists, and push delivery.
CREATE INDEX IF NOT EXISTS idx_profiles_phone
  ON public.profiles (phone)
  WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_created
  ON public.profiles (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON public.push_subscriptions (user_id);

-- Foreign-key/filter paths used by admin and marketplace screens.
CREATE INDEX IF NOT EXISTS idx_agent_requests_status_created
  ON public.agent_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_profiles_status
  ON public.agent_profiles (status);

CREATE INDEX IF NOT EXISTS idx_p2p_offers_active
  ON public.p2p_offers (active)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_p2p_transactions_buyer_created
  ON public.p2p_transactions (buyer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_p2p_transactions_agent_created
  ON public.p2p_transactions (agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_p2p_fraud_flags_unreviewed
  ON public.p2p_fraud_flags (reviewed, created_at DESC)
  WHERE reviewed = false;

-- UNO expiry and seat-order lookups.
CREATE INDEX IF NOT EXISTS idx_room_players_room_seat
  ON public.room_players (room_id, seat)
  INCLUDE (user_id);

COMMIT;