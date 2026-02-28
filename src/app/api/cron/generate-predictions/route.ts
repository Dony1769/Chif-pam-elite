import { NextResponse } from 'next/server';

// --- IMPORT DES SERVICES ---
import { fetchFootballMatches } from '@/services/fetchFootballMatches';
import { detectValue } from '@/services/valueEngine';
import { supabaseServer } from '@/lib/server-supabase';

// --- CONFIGURATION NEXT.JS ---
export const dynamic = 'force-dynamic'; // Obligatoire pour les API routes Vercel Cron
export const maxDuration = 60; // Timeout étendu pour les traitements de masse

// --- TYPES ---
interface PariPredictionInsert {
  id: string;
  home_team: string;
  away_team: string;
  league: string;
  match_date: string;
  expected_goals_home: number;
  expected_goals_away: number;
  probability_home: number;
  probability_draw: number;
  probability_away: number;
  over25_prob: number;
  value_home: boolean;
  value_draw: boolean;
  value_away: boolean;
  value_detected: boolean;
}

export async function GET(request: Request) {
  console.log("[CRON Predictions] Démarrage du générateur de prédictions...");

  try {
    // ========================================================================
    // ÉTAPE 5 : SÉCURITÉ CRON
    // ========================================================================
    const authHeader = request.headers.get("authorization");
    
    // Vérification stricte du token secret configuré dans Vercel
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.warn("[CRON Predictions] Accès refusé : Token CRON invalide ou manquant.");
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // ========================================================================
    // ÉTAPE 2 : FLOW COMPLET (Fetch & Simulation)
    // ========================================================================
    console.log("[CRON Predictions] Récupération des matchs via l'API externe...");
    const rawMatches = await fetchFootballMatches();

    if (!rawMatches || rawMatches.length === 0) {
      console.log("[CRON Predictions] Aucun match récupéré.");
      return NextResponse.json({ success: true, matches_processed: 0 }, { status: 200 });
    }

    // Pipeline de transformation
    const predictionsToUpsert: PariPredictionInsert[] = rawMatches.map((match) => {
      
      // --- SIMULATION DES EXPECTED GOALS (xG) ---
      // Random entre 0.8 et 2.2 pour Home
      const xgHome = Number((Math.random() * (2.2 - 0.8) + 0.8).toFixed(2));
      // Random entre 0.6 et 1.8 pour Away
      const xgAway = Number((Math.random() * (1.8 - 0.6) + 0.6).toFixed(2));
      const totalXg = xgHome + xgAway;

      // --- SIMULATION DE L'OVER 2.5 ---
      const over25 = totalXg > 2.6 ? 65.0 : 48.0;

      // --- SIMULATION DES PROBABILITÉS (1X2) ---
      // Variation aléatoire légère
      const varHome = (Math.random() * 6) - 3; // Variation de -3 à +3
      const varDraw = (Math.random() * 4) - 2; // Variation de -2 à +2
      
      const probHome = Number((45 + varHome).toFixed(2));
      const probDraw = Number((25 + varDraw).toFixed(2));
      // Calcul de probAway par soustraction pour garantir une somme absolue de 100%
      const probAway = Number((100 - probHome - probDraw).toFixed(2));

      // ========================================================================
      // ÉTAPE 3 : VALUE DETECTION (Cotes Manuelles)
      // ========================================================================
      // Le module detectValue est importé pour l'architecture future, 
      // mais nous forçons les valeurs à 'false' pour l'instant.
      
      /* Exemple d'implémentation future :
         const bookmakerOdds = { home: 2.1, draw: 3.2, away: 3.5 }; // À fetch dynamiquement
         const valueMetrics = detectValue({ home: probHome/100, draw: probDraw/100, away: probAway/100 }, bookmakerOdds);
      */

      return {
        id: match.fixture.id.toString(),
        home_team: match.teams.home.name,
        away_team: match.teams.away.name,
        // Construction du nom complet de la ligue
        league: `${match.league.country} - ${match.league.name}`,
        match_date: match.fixture.date,
        
        expected_goals_home: xgHome,
        expected_goals_away: xgAway,
        
        probability_home: probHome,
        probability_draw: probDraw,
        probability_away: probAway,
        
        over25_prob: over25,
        
        // Valeurs hardcodées selon contraintes de l'Étape 3
        value_home: false,
        value_draw: false,
        value_away: false,
        value_detected: false,
      };
    });

    // ========================================================================
    // ÉTAPE 4 : INSERT SUPABASE
    // ========================================================================
    console.log(`[CRON Predictions] Upsert de ${predictionsToUpsert.length} matchs dans la base de données...`);
    
    // Note: On présume que supabaseServer est une fonction async instanciant le client
    const supabase = await supabaseServer();

    const { error: upsertError } = await supabase
      .from('pari_predictions')
      .upsert(predictionsToUpsert, { onConflict: 'id' });

    if (upsertError) {
      throw new Error(`Erreur lors de l'Upsert Supabase : ${upsertError.message}`);
    }

    // ========================================================================
    // ÉTAPE 6 : RETURN JSON
    // ========================================================================
    console.log("[CRON Predictions] Cycle terminé avec succès.");
    
    return NextResponse.json({
      success: true,
      matches_processed: predictionsToUpsert.length
    }, { status: 200 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CRON Predictions] Échec du traitement :", errorMessage);
    
    // On retourne une erreur propre sans faire crasher silencieusement le script
    return NextResponse.json({
      success: false,
      message: "Erreur interne lors de la génération des prédictions."
    }, { status: 500 });
  }
}
