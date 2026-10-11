-- Migration: Make convertir_cp_en_htg SECURITY DEFINER and add caller verification
-- Date: 2026-07-23

BEGIN;

-- Replace function with SECURITY DEFINER and caller check
CREATE OR REPLACE FUNCTION public.convertir_cp_en_htg(p_user_id uuid, p_montant_cp bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_taux numeric;
    v_gain_htg numeric;
    v_solde_cp bigint;
    caller_sub text;
BEGIN
    -- Ensure caller (from JWT claims) matches requested user when present
    caller_sub := current_setting('jwt.claims.sub', true);
    IF caller_sub IS NOT NULL AND caller_sub::uuid <> p_user_id THEN
        RAISE EXCEPTION 'Not authorized: caller mismatch (%).', caller_sub;
    END IF;

    -- 1. Récupérer le taux de change
    SELECT valeur::numeric INTO v_taux FROM config_economie WHERE cle = 'taux_retrait_cp_vers_htg';

    -- 2. Vérifier le solde CP de l'utilisateur
    SELECT jetons_cp INTO v_solde_cp FROM profiles WHERE id = p_user_id FOR UPDATE;
    IF v_solde_cp < p_montant_cp THEN
        RAISE EXCEPTION 'Solde CP insuffisant';
    END IF;

    -- 3. Calculer le montant en HTG
    v_gain_htg := p_montant_cp * v_taux;

    -- 4. Transfert atomique
    UPDATE profiles
    SET jetons_cp = jetons_cp - p_montant_cp,
        balance = balance + v_gain_htg
    WHERE id = p_user_id;

    -- 5. Log de transaction
    INSERT INTO jetons_transactions (user_id, type, montant_cp, details)
    VALUES (p_user_id, 'conversion_htg', p_montant_cp, 'Conversion en ' || v_gain_htg || ' HTG');

END;
$function$;

-- Set owner to postgres (ensure migration runner has privilege to do so)
ALTER FUNCTION public.convertir_cp_en_htg(uuid, bigint) OWNER TO postgres;

COMMIT;
