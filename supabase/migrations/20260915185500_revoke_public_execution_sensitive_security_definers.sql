BEGIN;

DO $$
DECLARE
  function_signature text;
BEGIN
  FOREACH function_signature IN ARRAY ARRAY[
    'public.acheter_pack_jetons(uuid, uuid)',
    'public.add_referral_commission()',
    'public.admin_reset_password(uuid, text)',
    'public.buy_with_diamonds(uuid, uuid)',
    'public.cancel_vip_subscription()',
    'public.claim_calendar_reward(uuid)',
    'public.claim_glass_win(uuid, double precision)',
    'public.claim_glass_win(uuid)',
    'public.claim_mines_win(uuid, integer)',
    'public.claim_quiz_win(uuid, numeric)',
    'public.claim_task_reward(uuid, text)',
    'public.creer_partie_crash(uuid, numeric)',
    'public.distribuer_recompenses_cp()',
    'public.encaissez_partie_crash(uuid, uuid, numeric)',
    'public.enter_challenge(uuid, uuid)',
    'public.fn_messages_update_latest()',
    'public.get_total_balance()',
    'public.get_total_balance(uuid)',
    'public.handle_new_user_referral()',
    'public.handle_new_user()',
    'public.handle_referral_commission()',
    'public.handle_transaction_notifications()',
    'public.increment_challenge_score(uuid, uuid, integer)',
    'public.is_admin()',
    'public.jouer_partie_challenge(uuid, integer)',
    'public.p2p_refresh_agent_metrics(uuid)',
    'public.play_plinko(numeric, integer, text)',
    'public.process_bet(double precision)',
    'public.process_bet(numeric)',
    'public.process_game_result(uuid, text, numeric, boolean)',
    'public.process_game_win_crash(uuid, double precision)',
    'public.process_game_win_quiz(uuid, double precision)',
    'public.process_game_win(double precision, uuid, double precision)',
    'public.protect_profile_role()',
    'public.resolve_phone_issue_after_update()',
    'public.start_biometric_hack(numeric)',
    'public.start_elevator_game(numeric)',
    'public.start_glass_game(numeric, integer, integer, text, jsonb)',
    'public.start_laser_vault(numeric)',
    'public.submit_challenge_score(uuid, integer)',
    'public.subscribe_vip_plan(text, integer, integer, text)',
    'public.trigger_task_bio()',
    'public.trigger_task_quiz()',
    'public.trigger_task_vault()',
    'public.uno_create_room(bigint, smallint)',
    'public.uno_draw_card(uuid)',
    'public.uno_join_room(text, bigint)',
    'public.uno_play_card(uuid, text, text)',
    'public.uno_start_match(uuid)',
    'public.update_glass_progress(uuid, jsonb)',
    'public.update_mission_progress(uuid, text, integer)',
    'public.update_task_progress(uuid, text)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', function_signature);
  END LOOP;
END;
$$;

COMMIT;