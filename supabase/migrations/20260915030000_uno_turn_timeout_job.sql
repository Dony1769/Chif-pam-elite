BEGIN;

CREATE OR REPLACE FUNCTION public.uno_process_expired_turns()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room record;
  v_ids uuid[];
  v_count integer;
  v_index integer;
  v_next uuid;
  v_processed integer := 0;
BEGIN
  FOR v_room IN
    SELECT id, current_turn, turn_direction
    FROM public.rooms
    WHERE status = 'playing' AND turn_deadline_at IS NOT NULL AND turn_deadline_at <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT array_agg(user_id ORDER BY seat) INTO v_ids FROM public.room_players WHERE room_id = v_room.id;
    v_count := array_length(v_ids, 1);
    v_index := array_position(v_ids, v_room.current_turn);
    IF v_count IS NULL OR v_index IS NULL THEN CONTINUE; END IF;
    v_next := v_ids[((v_index - 1 + v_room.turn_direction + (v_count * 10)) % v_count) + 1];
    UPDATE public.rooms
    SET current_turn = v_next, turn_number = turn_number + 1,
        turn_started_at = now(), turn_deadline_at = now() + interval '45 seconds'
    WHERE id = v_room.id AND status = 'playing';
    v_processed := v_processed + 1;
  END LOOP;
  RETURN v_processed;
END;
$$;

REVOKE ALL ON FUNCTION public.uno_process_expired_turns() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('uno-expire-turns', '* * * * *', $job$SELECT public.uno_process_expired_turns();$job$)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'uno-expire-turns');

COMMIT;
