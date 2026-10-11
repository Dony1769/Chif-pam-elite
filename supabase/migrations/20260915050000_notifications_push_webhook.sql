BEGIN;

DROP TRIGGER IF EXISTS send_push_on_notification ON public.notifications;

CREATE TRIGGER send_push_on_notification
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://ohviqihuuoiwmpckifnt.supabase.co/functions/v1/send-push',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '5000'
);

COMMIT;
