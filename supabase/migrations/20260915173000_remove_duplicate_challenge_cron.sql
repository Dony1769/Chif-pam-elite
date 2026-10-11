BEGIN;

SELECT cron.unschedule('auto-close-challenges');

COMMIT;