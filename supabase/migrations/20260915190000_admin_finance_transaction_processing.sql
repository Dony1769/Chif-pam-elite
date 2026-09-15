BEGIN;

CREATE OR REPLACE FUNCTION public.admin_process_finance_transaction(
  p_transaction_id uuid,
  p_decision text,
  p_admin_note text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction public.transactions;
  v_amount numeric;
  v_role text;
BEGIN
  IF auth.role() <> 'service_role' THEN
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    IF v_role <> 'admin' THEN
      RAISE EXCEPTION 'Accès administrateur requis';
    END IF;
  END IF;

  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Décision invalide';
  END IF;

  SELECT * INTO v_transaction
  FROM public.transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction introuvable';
  END IF;
  IF v_transaction.status <> 'pending' THEN
    RAISE EXCEPTION 'Cette transaction a déjà été traitée';
  END IF;

  v_amount := coalesce(v_transaction.amount, 0);
  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'Montant de transaction invalide';
  END IF;

  IF v_transaction.type IN ('deposit', 'depot') AND p_decision = 'approved' THEN
    UPDATE public.profiles
    SET balance = coalesce(balance, 0) + v_amount
    WHERE id = v_transaction.user_id;
  ELSIF v_transaction.type IN ('withdrawal', 'retrait') THEN
    IF p_decision = 'rejected' THEN
      UPDATE public.profiles
      SET balance = coalesce(balance, 0) + v_amount,
          locked_balance = greatest(0, coalesce(locked_balance, 0) - v_amount)
      WHERE id = v_transaction.user_id;
    ELSE
      UPDATE public.profiles
      SET locked_balance = greatest(0, coalesce(locked_balance, 0) - v_amount)
      WHERE id = v_transaction.user_id;
    END IF;
  END IF;

  UPDATE public.transactions
  SET status = p_decision,
      admin_note = nullif(left(coalesce(p_admin_note, ''), 500), ''),
      processed_at = now()
  WHERE id = p_transaction_id;

  RETURN jsonb_build_object('success', true, 'message', 'Transaction traitée.');
END;
$$;

REVOKE ALL ON FUNCTION public.admin_process_finance_transaction(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_process_finance_transaction(uuid, text, text) TO authenticated, service_role;

COMMIT;