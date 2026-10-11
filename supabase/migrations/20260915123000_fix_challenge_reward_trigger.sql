BEGIN;

CREATE INDEX IF NOT EXISTS idx_challenge_attempts_challenge_score
  ON public.challenge_attempts (challenge_id, total_score DESC, user_id);

CREATE OR REPLACE FUNCTION public.distribute_challenge_rewards()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  winner RECORD;
  participant RECORD;
  prize_amount INT;
  msg_title TEXT;
  msg_content TEXT;
  rank_icon TEXT;
BEGIN
  IF OLD.is_active = true AND NEW.is_active = false THEN
    FOR winner IN (
      SELECT user_id, total_score,
             RANK() OVER (ORDER BY total_score DESC) AS final_rank
      FROM public.challenge_attempts
      WHERE challenge_id = NEW.id
      ORDER BY total_score DESC
      LIMIT 3
    ) LOOP
      IF winner.final_rank = 1 THEN
        prize_amount := NEW.prize_pool_cp * 0.5;
        msg_title := '🥇 VICTOIRE SUPRÊME !';
        rank_icon := '1ère';
      ELSIF winner.final_rank = 2 THEN
        prize_amount := NEW.prize_pool_cp * 0.3;
        msg_title := '🥈 PODIUM ATTEINT !';
        rank_icon := '2ème';
      ELSE
        prize_amount := NEW.prize_pool_cp * 0.2;
        msg_title := '🥉 RANG BRONZE !';
        rank_icon := '3ème';
      END IF;

      UPDATE public.profiles
      SET jetons_cp = jetons_cp + prize_amount
      WHERE id = winner.user_id;

      INSERT INTO public.notifications (user_id, title, content, type)
      VALUES (
        winner.user_id,
        msg_title,
        'Tu as fini ' || rank_icon || ' du défi ' || NEW.title || ' ! ' ||
          'Récompense encaissée : ' || prize_amount || ' CP. Ton score final : ' || winner.total_score,
        'VICTOIRE'
      );
    END LOOP;

    FOR participant IN (
      SELECT user_id
      FROM public.challenge_attempts
      WHERE challenge_id = NEW.id
        AND user_id NOT IN (
          SELECT user_id
          FROM public.challenge_attempts
          WHERE challenge_id = NEW.id
          ORDER BY total_score DESC
          LIMIT 3
        )
    ) LOOP
      INSERT INTO public.notifications (user_id, title, content, type)
      VALUES (
        participant.user_id,
        '🏁 MISSION TERMINÉE',
        'Le défi ' || NEW.title || ' est clos. Tu n''as pas atteint le podium cette fois, mais tes points ont été enregistrés pour ton rang global !',
        'SYSTEM'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

COMMIT;