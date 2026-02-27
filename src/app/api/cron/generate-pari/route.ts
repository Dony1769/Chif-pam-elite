import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// --- IMPORT DES SERVICES ---
import { fetchFootballMatches, FootballMatchRaw } from '@/services/fetchFootballMatches';
import { analyzeMatch } from '@/services/matchEngine';
import { evaluateMatchValues } from '@/services/valueEngine';

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

// --- INITIALISATION SUPABASE ADMIN ---
// Utilisation du SERVICE_ROLE pour contourner le RLS lors des tâches de fond
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false }
  }
);

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Autorise jusqu'à 60s d'exécution sur Vercel

export async function GET(request: Request) {
  console.log("[CRON Orchestrator] Démarrage du cycle de prédiction...");

  try {
    // 1. VÉRIFICATION DE SÉCURITÉ
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.warn("[CRON Orchestrator] Accès refusé : Mauvais CRON_SECRET.");
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // 2. EXTRACTION (Appel du service réseau)
    console.log("[CRON Orchestrator] Appel de fetchFootballMatches()...");
    const rawMatches: FootballMatchRaw[] = await fetchFootballMatches();

    if (!rawMatches || rawMatches.length === 0) {
      console.log("[CRON Orchestrator] Aucun match à traiter.");
      return NextResponse.json({ success: true, inserted: 0, updated: 0, message: "Aucun match." });
    }

    // 3. TRANSFORMATION (Pipeline de calcul)
    console.log(`[CRON Orchestrator] Traitement de ${rawMatches.length} matchs via les moteurs...`);
    
    const predictionsToUpsert: PariPredictionInsert[] = rawMatches.map((match) => {

  // A. Calcul probabilités + xG directement depuis le match brut
  const matchProbs = analyzeMatch(match);

  // B. Cotes fallback temporaires (à remplacer plus tard)
  const bookmakerOdds = {
    home: 2.50,
    draw: 3.20,
    away: 2.80
  };

  // ⚠️ IMPORTANT
  // Si ton matchEngine retourne des % (ex: 52.34)
  // alors on convertit en décimal ici
  const modelProbabilities = {
    home: matchProbs.probability_home / 100,
    draw: matchProbs.probability_draw / 100,
    away: matchProbs.probability_away / 100,
  };

  const valueMetrics = evaluateMatchValues(
    modelProbabilities,
    bookmakerOdds
  );

  // C. Construction finale pour DB
  return {
    id: match.fixture.id.toString(),
    home_team: match.teams.home.name,
    away_team: match.teams.away.name,
    league: `${match.league.country} - ${match.league.name}`,
    match_date: match.fixture.date,
    expected_goals_home: matchProbs.expected_goals_home,
    expected_goals_away: matchProbs.expected_goals_away,
    probability_home: matchProbs.probability_home,
    probability_draw: matchProbs.probability_draw,
    probability_away: matchProbs.probability_away,
    over25_prob: matchProbs.over25_prob,
    value_home: valueMetrics.value_home,
    value_draw: valueMetrics.value_draw,
    value_away: valueMetrics.value_away,
    value_detected: valueMetrics.value_detected,
  };
});

    // 4. CHARGEMENT (Upsert Supabase)
    console.log("[CRON Orchestrator] Insertion/Mise à jour dans Supabase...");
    const { data: upsertResult, error: upsertError } = await supabaseAdmin
      .from('pari_predictions')
      .upsert(predictionsToUpsert, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select('id');

    if (upsertError) {
      // On throw l'erreur pour qu'elle soit attrapée par le catch global du Cron
      throw new Error(`Erreur Supabase Upsert: ${upsertError.message}`);
    }

    // 5. RÉPONSE PROPRE
    const processedCount = upsertResult?.length || 0;
    console.log(`[CRON Orchestrator] Terminé avec succès. ${processedCount} matchs traités.`);
    
    return NextResponse.json(
      { success: true, inserted: processedCount, updated: processedCount },
      { status: 200 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CRON Orchestrator] Échec de l'orchestration :", errorMessage);
    
    // Retour d'une erreur 500 propre sans exposer la stack trace
    return NextResponse.json(
      { success: false, message: "Erreur lors de la génération des paris." },
      { status: 500 }
    );
  }
}
